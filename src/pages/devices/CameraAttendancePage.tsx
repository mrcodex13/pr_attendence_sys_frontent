import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as faceapi from '@vladmandic/face-api'
import { api, CameraFrameError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'
import type { Group } from '../../types/domain'

type CameraPerson = Awaited<ReturnType<typeof api.cameraTemplates>>[number]
type CameraMode = 'attendance' | 'enrollment'
type CameraSource = 'amb82' | 'webcam'
type EnrollmentFilter = 'pending' | 'all' | 'enrolled'

interface LiveScan {
  id: string
  personId: string
  name: string
  personCode: string
  time: string
  alreadyRecorded: boolean
}

export function CameraAttendancePage() {
  const { can } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastAutoScanRef = useRef<Record<string, number>>({})

  // Groups and Roster
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState('')
  const [people, setPeople] = useState<CameraPerson[]>([])
  const [personId, setPersonId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modes & Camera Source
  const [mode, setMode] = useState<CameraMode>('attendance')
  const [cameraSource, setCameraSource] = useState<CameraSource>('amb82') // AMB82-Mini by default
  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentFilter>('pending')

  // Camera State
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<'off' | 'connecting' | 'connected' | 'unavailable'>('off')
  const [cameraError, setCameraError] = useState('')
  const [modelsReady, setModelsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Auto-Scan & Live Scans
  const [autoScanEnabled, setAutoScanEnabled] = useState(false)
  const [recentScans, setRecentScans] = useState<LiveScan[]>([])
  const [matchToast, setMatchToast] = useState<{ name: string; personCode: string; status: string } | null>(null)

  // Enrollment State
  const [cameraConsentConfirmed, setCameraConsentConfirmed] = useState(true)
  const [samples, setSamples] = useState<number[][]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [matchMessage, setMatchMessage] = useState('')

  // RTSP Config
  const [rtspUrl, setRtspUrl] = useState('')
  const [showRtspEdit, setShowRtspEdit] = useState(false)
  const [newRtspUrl, setNewRtspUrl] = useState('')

  // Load groups, models, and RTSP config on mount
  useEffect(() => {
    let active = true
    Promise.all([
      api.directoryGroups(),
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      api.amb82CameraConfig().catch(() => ({ url: 'rtsp://10.130.136.20:554', configured: true })),
    ]).then(([groupRows, , , , cfg]) => {
      if (!active) return
      setGroups(groupRows)
      setGroupId(groupRows[0]?.id ?? '')
      setModelsReady(true)
      if (cfg?.url) {
        setRtspUrl(cfg.url)
        setNewRtspUrl(cfg.url)
      }
    }).catch((err: unknown) => {
      if (active) {
        setError(err instanceof Error
          ? `Could not prepare camera attendance: ${err.message}`
          : 'Could not prepare camera attendance.')
      }
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  // Load people for current group
  useEffect(() => {
    let active = true
    if (!groupId) return
    api.cameraTemplates(groupId).then((rows) => {
      if (!active) return
      setPeople(rows)
      setPersonId((current) => rows.some((person) => person.personId === current)
        ? current
        : rows[0]?.personId ?? '')
      setSamples([])
    }).catch((err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : 'Could not load group people.')
        }
    })
    return () => {
      active = false
    }
  }, [groupId])

  // Stop media stream tracks
  const stopWebcamTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Stop camera helper
  const stopCamera = useCallback(() => {
    setCameraActive(false)
    setCameraStatus('off')
    setCameraError('')
    setSamples([])
    setMessage('')
    stopWebcamTracks()
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [stopWebcamTracks])

  // Start Camera
  const startCamera = useCallback(async () => {
    setError('')
    setMessage('')
    setCameraError('')
    setCameraStatus('connecting')
    setCameraActive(true)

    if (cameraSource === 'webcam') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        })
        mediaStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraStatus('connected')
      } catch (err) {
        setCameraStatus('unavailable')
        setCameraError(err instanceof Error ? `Webcam error: ${err.message}` : 'Webcam access denied or unavailable.')
      }
    }
  }, [cameraSource])

  // Switch camera source cleanly
  const switchCameraSource = (nextSource: CameraSource) => {
    if (nextSource === cameraSource) return
    stopCamera()
    setCameraSource(nextSource)
    setError('')
    setCameraError('')
  }

  // Draw face detection HUD overlay on canvas
  const drawFaceHud = useCallback((
    canvas: HTMLCanvasElement,
    detections: Array<{ box: { x: number; y: number; width: number; height: number } }>,
    label = 'Face detected',
    color = '#10b981',
  ) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    for (const { box } of detections) {
      const { x, y, width: w, height: h } = box
      const corner = Math.min(20, w / 4, h / 4)
      ctx.lineWidth = 3
      ctx.strokeStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 10

      // Top-left
      ctx.beginPath()
      ctx.moveTo(x, y + corner)
      ctx.lineTo(x, y)
      ctx.lineTo(x + corner, y)
      ctx.stroke()

      // Top-right
      ctx.beginPath()
      ctx.moveTo(x + w - corner, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + corner)
      ctx.stroke()

      // Bottom-right
      ctx.beginPath()
      ctx.moveTo(x + w, y + h - corner)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x + w - corner, y + h)
      ctx.stroke()

      // Bottom-left
      ctx.beginPath()
      ctx.moveTo(x + corner, y + h)
      ctx.lineTo(x, y + h)
      ctx.lineTo(x, y + h - corner)
      ctx.stroke()

      // Name / Status Badge
      ctx.shadowBlur = 0
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
      const textWidth = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.fillRect(x, Math.max(0, y - 26), textWidth + 14, 22)
      ctx.fillStyle = color
      ctx.fillText(label, x + 7, Math.max(16, y - 10))
    }
    ctx.restore()
  }, [])

  // Webcam live projection loop with face tracking
  useEffect(() => {
    if (!cameraActive || cameraSource !== 'webcam') return
    let active = true
    let lastDetectionTime = 0

    const renderLoop = async () => {
      if (!active) return
      const video = videoRef.current
      const canvas = canvasRef.current

      if (video && canvas && video.readyState >= 2) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        }

        const now = Date.now()
        if (modelsReady && now - lastDetectionTime > 250) {
          lastDetectionTime = now
          try {
            const detections = await faceapi.detectAllFaces(
              canvas,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }),
            )
            if (active && detections.length > 0) {
              drawFaceHud(canvas, detections, detections.length === 1 ? 'Face detected' : `${detections.length} faces visible`)
            }
          } catch {
            // ignore frame detection glitches
          }
        }
      }
      if (active) {
        animFrameRef.current = requestAnimationFrame(renderLoop)
      }
    }

    animFrameRef.current = requestAnimationFrame(renderLoop)
    return () => {
      active = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [cameraActive, cameraSource, modelsReady, drawFaceHud])

  // AMB82-Mini polling loop
  useEffect(() => {
    if (!cameraActive || cameraSource !== 'amb82') return
    const controller = new AbortController()
    let active = true
    let timer = 0
    let lastDetectionAt = 0
    let detectionInProgress = false
    const detectionCanvas = document.createElement('canvas')

    async function pollFrame() {
      let bitmap: ImageBitmap | null = null
      try {
        const frame = await api.amb82CameraFrame(controller.signal)
        bitmap = await createImageBitmap(frame)
        if (active && canvasRef.current) {
          const canvas = canvasRef.current
          if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width
            canvas.height = bitmap.height
          }
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(bitmap, 0, 0)
          setCameraStatus('connected')
          setCameraError('')

          const now = performance.now()
          if (modelsReady && !detectionInProgress && now - lastDetectionAt >= 500) {
            lastDetectionAt = now
            detectionInProgress = true
            detectionCanvas.width = bitmap.width
            detectionCanvas.height = bitmap.height
            detectionCanvas.getContext('2d')?.drawImage(bitmap, 0, 0)
            void (async () => {
              try {
                const detections = await faceapi.detectAllFaces(
                  detectionCanvas,
                  new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }),
                )
                const currentCanvas = canvasRef.current
                if (active && currentCanvas && detections.length > 0) {
                  drawFaceHud(currentCanvas, detections, detections.length === 1 ? 'Face detected' : `${detections.length} faces visible`)
                }
              } catch {
                // Ignore transient detector errors while the stream continues.
              } finally {
                detectionInProgress = false
              }
            })()
          }
        }
      } catch (err) {
        if (active) {
          if (err instanceof CameraFrameError && err.code === 'AMB82_STREAM_CONNECTING') {
            setCameraStatus('connecting')
            setCameraError('')
          } else {
            setCameraStatus('unavailable')
            setCameraError(err instanceof Error ? err.message : 'The AMB82 camera stream is unavailable.')
          }
        }
      } finally {
        bitmap?.close()
        if (active) timer = window.setTimeout(() => void pollFrame(), 150)
      }
    }

    void pollFrame()
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [cameraActive, cameraSource, modelsReady, drawFaceHud])

  // Capture face descriptor from canvas
  async function captureDescriptor() {
    const canvas = canvasRef.current
    if (!canvas || canvas.width === 0 || !modelsReady) {
      throw new Error('Camera is not active or face recognition models are still loading.')
    }
    const detections = await faceapi
      .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.55 }))
      .withFaceLandmarks()
      .withFaceDescriptors()

    if (detections.length === 0) {
      throw new Error('No face detected. Please face the camera directly.')
    }
    if (detections.length > 1) {
      throw new Error('Multiple faces visible. Ensure only one person is in frame.')
    }
    return Array.from(detections[0].descriptor)
  }

  // Scan and mark attendance
  async function scanAttendance() {
    if (!groupId || !cameraActive || cameraStatus !== 'connected') return
    setError('')
    setMessage('')
    setMatchMessage('')
    setBusy(true)
    try {
      const descriptor = await captureDescriptor()
      const result = await api.recognizeCameraFace(groupId, descriptor)
      if (!result.matched) {
        setMatchMessage(result.reason === 'AMBIGUOUS'
          ? 'Face matched multiple students ambiguously. Please enroll clearer samples.'
          : 'No enrolled student face matched.')
        return
      }
      const scanItem: LiveScan = {
        id: result.attendance.id,
        personId: result.person.id,
        name: result.person.name,
        personCode: result.person.personCode,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        alreadyRecorded: result.attendance.alreadyRecorded,
      }
      setRecentScans((curr) => [scanItem, ...curr.slice(0, 9)])
      setMatchToast({
        name: result.person.name,
        personCode: result.person.personCode,
        status: result.attendance.alreadyRecorded ? 'Already Recorded Today' : 'Marked Present',
      })
      setTimeout(() => setMatchToast(null), 4000)

      setMatchMessage(result.attendance.alreadyRecorded
        ? `${result.person.name} recognized (${result.person.personCode}) - already recorded today.`
        : `Attendance recorded for ${result.person.name} (${result.person.personCode})!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not scan attendance.')
    } finally {
      setBusy(false)
    }
  }

  // Auto-scan loop
  useEffect(() => {
    if (!autoScanEnabled || !cameraActive || cameraStatus !== 'connected' || mode !== 'attendance' || !groupId) return
    let active = true

    const interval = window.setInterval(async () => {
      if (!active || busy) return
      try {
        const descriptor = await captureDescriptor()
        const result = await api.recognizeCameraFace(groupId, descriptor)
        if (result.matched && active) {
          const now = Date.now()
          const lastScanned = lastAutoScanRef.current[result.person.id] || 0
          if (now - lastScanned > 6000) {
            lastAutoScanRef.current[result.person.id] = now
            const scanItem: LiveScan = {
              id: result.attendance.id,
              personId: result.person.id,
              name: result.person.name,
              personCode: result.person.personCode,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              alreadyRecorded: result.attendance.alreadyRecorded,
            }
            setRecentScans((curr) => [scanItem, ...curr.slice(0, 9)])
            setMatchToast({
              name: result.person.name,
              personCode: result.person.personCode,
              status: result.attendance.alreadyRecorded ? 'Already Recorded Today' : 'Marked Present',
            })
            setTimeout(() => setMatchToast(null), 4000)
          }
        }
      } catch {
        // quiet in auto-scan mode
      }
    }, 1400)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [autoScanEnabled, cameraActive, cameraStatus, mode, groupId, busy])

  // Quick 1-Click Enrollment
  async function quickEnroll() {
    if (!personId) return
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const descriptor = await captureDescriptor()
      await api.enrollCameraFace(personId, [descriptor], cameraConsentConfirmed)
      const enrolledPerson = selectedPerson
      setPeople((curr) => curr.map((p) => p.personId === personId
        ? { ...p, cameraConsentGiven: true, enrolled: true }
        : p))
      setMessage(`Successfully enrolled ${enrolledPerson?.name ?? 'person'} with 1-click!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enroll face.')
    } finally {
      setBusy(false)
    }
  }

  // Multi-sample sample capture
  async function captureSample() {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const descriptor = await captureDescriptor()
      const next = [...samples.slice(-2), descriptor]
      setSamples(next)
      setMessage(`Sample ${next.length} of 3 captured. ${next.length < 3 ? 'Tilt face slightly for the next.' : 'Ready to save!'}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not capture face sample.')
    } finally {
      setBusy(false)
    }
  }

  // Save 3-sample enrollment
  async function saveMultiEnrollment() {
    if (!personId || samples.length === 0) return
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await api.enrollCameraFace(personId, samples, cameraConsentConfirmed)
      const enrolledPerson = selectedPerson
      setPeople((curr) => curr.map((p) => p.personId === personId
        ? { ...p, cameraConsentGiven: true, enrolled: true }
        : p))
      setSamples([])
      setMessage(`Face template successfully saved for ${enrolledPerson?.name ?? 'student'}!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save enrollment.')
    } finally {
      setBusy(false)
    }
  }

  // Delete Enrollment
  async function deleteEnrollment(targetPersonId: string) {
    if (!window.confirm('Delete this face template?')) return
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await api.deleteCameraFace(targetPersonId)
      setPeople((curr) => curr.map((p) => p.personId === targetPersonId ? { ...p, enrolled: false } : p))
      setMessage('Face template deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete template.')
    } finally {
      setBusy(false)
    }
  }

  // Update RTSP URL
  async function saveRtspUrl() {
    if (!newRtspUrl.trim()) return
    setError('')
    setBusy(true)
    try {
      await api.updateAmb82CameraConfig(newRtspUrl.trim())
      setRtspUrl(newRtspUrl.trim())
      setShowRtspEdit(false)
      setMessage(`AMB82 RTSP URL updated to ${newRtspUrl.trim()}`)
      if (cameraActive && cameraSource === 'amb82') {
        stopCamera()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update RTSP URL.')
    } finally {
      setBusy(false)
    }
  }

  const enrolledCount = people.filter((p) => p.enrolled && p.cameraConsentGiven).length
  const pendingCount = people.length - enrolledCount
  const filteredPeople = people.filter((p) => {
    const enrolled = p.enrolled && p.cameraConsentGiven
    if (enrollmentFilter === 'pending' && enrolled) return false
    if (enrollmentFilter === 'enrolled' && !enrolled) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.personCode.toLowerCase().includes(q)
    }
    return true
  })
  const selectedPerson = people.find((p) => p.personId === personId)

  return (
    <div className="view-stack camera-attendance">
      <PageHeader
        title="Smart Camera Attendance"
        subtitle="Mark attendance using AMB82-Mini AI camera or local webcam projection."
        actions={
          <div className="toolbar-actions">
            <Link className="button button-secondary" to="/attendance">
              Manual Attendance Log
            </Link>
          </div>
        }
      />

      {loading && <p className="muted" role="status">Preparing camera attendance system…</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      {cameraError && <p className="field-error" role="alert">{cameraError}</p>}
      {message && <p className="camera-message" role="status">{message}</p>}
      {matchMessage && <p className="camera-message" role="status">{matchMessage}</p>}

      {/* Top Controls: Group Selector & Mode Tabs */}
      <section className="panel camera-controls">
        <label className="form-field" style={{ minWidth: 260 }}>
          <span>Selected Group / Class</span>
          <select
            value={groupId}
            onChange={(e) => {
              stopCamera()
              setGroupId(e.target.value)
              setSamples([])
              setMatchMessage('')
            }}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        {/* Camera Source Selector: AMB82-Mini (Default) vs Webcam */}
        <div className="camera-source-tabs" role="group" aria-label="Camera Source Selection">
          <button
            type="button"
            className={`camera-source-btn ${cameraSource === 'amb82' ? 'active' : ''}`}
            onClick={() => switchCameraSource('amb82')}
          >
            📡 AMB82-Mini (Default)
          </button>
          <button
            type="button"
            className={`camera-source-btn ${cameraSource === 'webcam' ? 'active' : ''}`}
            onClick={() => switchCameraSource('webcam')}
          >
            📷 Laptop Webcam
          </button>
        </div>

        {/* Mode Tabs: Scan vs Enroll */}
        <div className="filter-tabs" role="tablist" aria-label="Task Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'attendance'}
            className={mode === 'attendance' ? 'active' : ''}
            onClick={() => {
              setMode('attendance')
              setSamples([])
            }}
          >
            ⚡ Scan Attendance
          </button>
          {can('people.manage') && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'enrollment'}
              className={mode === 'enrollment' ? 'active' : ''}
              onClick={() => {
                setMode('enrollment')
                setSamples([])
              }}
            >
              👤 Enroll Faces
            </button>
          )}
        </div>
      </section>

      {/* Main Layout: Camera Screen Projection on Left, Controls/Roster on Right */}
      <div className="camera-layout">
        {/* Left Panel: Camera Projection Canvas */}
        <section className="panel camera-preview-panel">
          {/* Hidden video element for local webcam feed */}
          <video ref={videoRef} playsInline autoPlay muted style={{ display: 'none' }} />

          <div className="camera-preview">
            <canvas ref={canvasRef} aria-label="Camera video projection screen" />

            {/* Live Indicator Pill */}
            {cameraActive && cameraStatus === 'connected' && (
              <div className="camera-live-overlay">
                <span className="camera-badge-pill">
                  <span className="pulse-dot" /> LIVE {cameraSource === 'amb82' ? 'AMB82-MINI' : 'WEBCAM'}
                </span>
              </div>
            )}

            {/* Floating Attendance Match Toast */}
            {matchToast && (
              <div className="camera-match-toast">
                <strong>✓ {matchToast.name}</strong>
                <small>ID: {matchToast.personCode} · {matchToast.status}</small>
              </div>
            )}

            {/* Camera Offline Placeholder */}
            {!cameraActive && (
              <div className="camera-placeholder">
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>
                    {cameraSource === 'amb82' ? 'AMB82-Mini Camera is Off' : 'Laptop Webcam is Off'}
                  </p>
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => void startCamera()}
                    disabled={!modelsReady}
                  >
                    {modelsReady
                      ? (cameraSource === 'amb82' ? 'Connect AMB82-Mini' : 'Start Laptop Webcam')
                      : 'Loading Face AI Models…'}
                  </button>
                </div>
              </div>
            )}

            {/* Connecting or Error State */}
            {cameraActive && cameraStatus !== 'connected' && (
              <div className="camera-placeholder">
                <div style={{ textAlign: 'center', maxWidth: 360, padding: 20 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 8px' }}>
                    {cameraStatus === 'connecting'
                      ? (cameraSource === 'amb82' ? 'Connecting to AMB82-Mini RTSP…' : 'Starting Webcam…')
                      : (cameraSource === 'amb82' ? 'AMB82-Mini Stream Unavailable' : 'Webcam Not Available')}
                  </p>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px' }}>
                    {cameraSource === 'amb82'
                      ? `Could not reach ${rtspUrl || 'AMB82 IP'}. Ensure AMB82 is powered on WiFi.`
                      : 'Check browser camera permissions.'}
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {cameraSource === 'amb82' && (
                      <button
                        className="button button-primary button-sm"
                        type="button"
                        onClick={() => switchCameraSource('webcam')}
                      >
                        📷 Switch to Laptop Webcam
                      </button>
                    )}
                    <button className="button button-secondary button-sm" type="button" onClick={stopCamera}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Toolbar below video projection */}
          <div className="camera-stream-toolbar">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {cameraActive ? (
                <button className="button button-secondary button-sm" type="button" onClick={stopCamera}>
                  Stop Camera
                </button>
              ) : (
                <button
                  className="button button-primary button-sm"
                  type="button"
                  onClick={() => void startCamera()}
                  disabled={!modelsReady}
                >
                  {modelsReady ? 'Start Camera' : 'Loading models…'}
                </button>
              )}

              {/* Continuous Auto-Scan Toggle in Attendance Mode */}
              {mode === 'attendance' && (
                <label className="camera-auto-toggle" title="Automatically marks attendance when an enrolled student appears">
                  <input
                    type="checkbox"
                    checked={autoScanEnabled}
                    onChange={(e) => setAutoScanEnabled(e.target.checked)}
                  />
                  <span>Auto-Scan Continuous</span>
                </label>
              )}
            </div>

            {/* Manual Scan Button */}
            {cameraActive && mode === 'attendance' && (
              <button
                className="button button-primary"
                type="button"
                onClick={() => void scanAttendance()}
                disabled={busy || cameraStatus !== 'connected'}
              >
                {busy ? 'Scanning…' : '⚡ Scan Face & Mark Attendance'}
              </button>
            )}
          </div>

          {/* AMB82 Stream Info & Config Accordion */}
          {cameraSource === 'amb82' && (
            <div className="camera-rtsp-settings-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  AMB82 Stream: <strong style={{ color: 'var(--ink)' }}>{rtspUrl || 'rtsp://10.130.136.20:554'}</strong>
                </span>
                <button
                  className="button button-sm button-ghost"
                  type="button"
                  onClick={() => setShowRtspEdit((open) => !open)}
                >
                  {showRtspEdit ? 'Hide' : 'Change RTSP URL'}
                </button>
              </div>

              {showRtspEdit && (
                <div className="rtsp-row">
                  <input
                    type="text"
                    placeholder="rtsp://<camera-ip>:554"
                    value={newRtspUrl}
                    onChange={(e) => setNewRtspUrl(e.target.value)}
                  />
                  <button
                    className="button button-primary button-sm"
                    type="button"
                    onClick={() => void saveRtspUrl()}
                    disabled={busy || !newRtspUrl.trim()}
                  >
                    Save URL
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Today's Live Scans Feed */}
          {mode === 'attendance' && recentScans.length > 0 && (
            <div className="camera-history-section">
              <h4>Live Scans Today ({recentScans.length})</h4>
              <div className="camera-history-feed">
                {recentScans.map((scan) => (
                  <div key={scan.id + scan.time} className="camera-history-item">
                    <span>
                      <strong>{scan.name}</strong> · <small style={{ color: 'var(--muted)' }}>{scan.personCode}</small>
                    </span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`status-pill ${scan.alreadyRecorded ? 'late' : 'present'}`}>
                        {scan.alreadyRecorded ? 'Already In' : 'Present'}
                      </span>
                      <span className="history-time">{scan.time}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Panel: Enrollment Roster or Enrolled Faces */}
        <section className="panel camera-enrollment-panel">
          {mode === 'enrollment' && can('people.manage') ? (
            <>
              <h2>Student Face Enrollment</h2>
              <p className="muted" style={{ fontSize: 13, margin: '0 0 14px' }}>
                Select a student from the list, align their face with the camera projection, and capture.
              </p>

              {/* Progress Summary */}
              <div className="camera-enrollment-progress">
                <strong>{enrolledCount} of {people.length} enrolled</strong>
                <span>{pendingCount} remaining</span>
              </div>

              {/* Filter Tabs */}
              <div className="camera-enrollment-filters">
                {([
                  ['pending', `Needs (${pendingCount})`],
                  ['all', `All (${people.length})`],
                  ['enrolled', `Enrolled (${enrolledCount})`],
                ] as const).map(([filter, lbl]) => (
                  <button
                    key={filter}
                    className={`button button-sm ${enrollmentFilter === filter ? 'button-primary' : 'button-secondary'}`}
                    type="button"
                    onClick={() => setEnrollmentFilter(filter)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Search Filter */}
              <input
                type="search"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  marginBottom: 10,
                  fontSize: 13,
                }}
              />

              {/* Student Roster List */}
              {people.length === 0 ? (
                <div>
                  <EmptyState
                    title="No people in this group"
                    hint="Add people or import your CSV before enrolling faces."
                  />
                  <Link className="button button-secondary button-sm" to="/people/import">Go to people import</Link>
                </div>
              ) : filteredPeople.length === 0 ? (
                <EmptyState
                  title={searchQuery ? 'No people match your search' : 'No people match this filter'}
                  hint={enrollmentFilter === 'enrolled'
                    ? 'No faces are enrolled for the current filter.'
                    : enrollmentFilter === 'pending'
                      ? 'All people in this group are enrolled.'
                      : 'Try a different search.'}
                />
              ) : (
                <ul className="camera-roster-list" aria-label="Group Student Roster">
                  {filteredPeople.map((person) => {
                    const enrolled = person.enrolled && person.cameraConsentGiven
                    return (
                      <li key={person.personId}>
                        <button
                          className={`camera-roster-person ${person.personId === personId ? 'selected' : ''}`}
                          type="button"
                          onClick={() => {
                            setPersonId(person.personId)
                            setSamples([])
                            setError('')
                            setMessage('')
                          }}
                        >
                          <span className="camera-roster-identity">
                            <strong>{person.name}</strong>
                            <small>{person.personCode}</small>
                          </span>
                          <span className={`camera-roster-status ${enrolled ? 'enrolled' : ''}`}>
                            {enrolled ? '✓ Enrolled' : 'Pending'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* Selected Student Enrollment Controls */}
              {selectedPerson && (
                <div className="camera-selected-person">
                  <h3>{selectedPerson.name}</h3>
                  <p className="muted" style={{ fontSize: 13 }}>Roll No / ID: {selectedPerson.personCode}</p>

                  <label className="camera-consent-check">
                    <input
                      type="checkbox"
                      checked={cameraConsentConfirmed}
                      onChange={(e) => setCameraConsentConfirmed(e.target.checked)}
                    />
                    <span>Explicit student consent for encrypted face template storage.</span>
                  </label>

                  <div className="camera-actions">
                    <button
                      className="button button-primary camera-fast-enroll-btn"
                      type="button"
                      onClick={() => void quickEnroll()}
                      disabled={!cameraActive || cameraStatus !== 'connected' || busy || !cameraConsentConfirmed}
                      title="Captures current face frame and enrolls immediately"
                    >
                      ⚡ Quick Enroll (1-Click)
                    </button>

                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => void captureSample()}
                      disabled={!cameraActive || cameraStatus !== 'connected' || busy || samples.length >= 3 || !cameraConsentConfirmed}
                    >
                      📸 Sample {samples.length}/3
                    </button>

                    {samples.length > 0 && (
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={() => void saveMultiEnrollment()}
                        disabled={busy}
                      >
                        Save ({samples.length} Samples)
                      </button>
                    )}
                  </div>

                  {selectedPerson.enrolled && (
                    <button
                      className="button button-danger button-sm camera-delete-button"
                      type="button"
                      onClick={() => void deleteEnrollment(selectedPerson.personId)}
                      disabled={busy}
                    >
                      Delete Face Template
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Attendance Mode Roster View */
            <>
              <h2>Enrolled Faces in Group</h2>
              <p className="muted" style={{ fontSize: 13, margin: '0 0 14px' }}>
                Students with registered face templates ready for camera recognition.
              </p>

              {people.filter((p) => p.enrolled && p.cameraConsentGiven).length === 0 ? (
                <EmptyState
                  title="No student faces enrolled yet"
                  hint="Switch to the 'Enroll Faces' tab above to register student faces using the camera."
                />
              ) : (
                <ul className="camera-enrolled-list">
                  {people.filter((p) => p.enrolled && p.cameraConsentGiven).map((person) => (
                    <li key={person.personId}>
                      <span>
                        <strong>{person.name}</strong>
                        <small>{person.personCode}</small>
                      </span>
                      {can('people.manage') && (
                        <button
                          className="button button-sm button-danger"
                          type="button"
                          onClick={() => void deleteEnrollment(person.personId)}
                          disabled={busy}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
