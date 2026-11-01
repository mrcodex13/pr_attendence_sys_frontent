import type {
  AttendanceRecord,
  AuditLog,
  Course,
  CreatedInvitation,
  DashboardStats,
  Group,
  Holiday,
  LeaveRequest,
  ManagedOrganization,
  NotificationItem,
  OrgSettings,
  PendingInvitation,
  Person,
  ScanEvent,
  ScheduleSlot,
  Shift,
  User,
  Role,
} from '../types/domain'

const TOKEN_KEY = 'sas.access'
const REFRESH_KEY = 'sas.refresh'
const USER_KEY = 'sas.user'
const SERVER_UNAVAILABLE_MESSAGE = "Can't reach the server. Try again in a moment or contact your admin."
const SERVER_STARTING_MESSAGE = 'The server is starting up, this can take up to a minute.'
const SLOW_REQUEST_MS = 4000
const REQUEST_TIMEOUT_MS = 65_000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

if (import.meta.env.PROD && !API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL must be set to the deployed backend origin before building the frontend.')
}

let pendingSlowRequests = 0

function apiUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

function reportSlowRequest(active: boolean) {
  pendingSlowRequests = Math.max(0, pendingSlowRequests + (active ? 1 : -1))
  window.dispatchEvent(new CustomEvent('sas:server-starting', {
    detail: { active: pendingSlowRequests > 0 },
  }))
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const startedAt = Date.now()
  const controller = new AbortController()
  const externalSignal = options.signal
  let timedOut = false
  let slowRequestReported = false
  const slowTimer = window.setTimeout(() => {
    slowRequestReported = true
    reportSlowRequest(true)
  }, SLOW_REQUEST_MS)
  const timeoutTimer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort(externalSignal?.reason)

  if (externalSignal?.aborted) abortFromCaller()
  else externalSignal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    return await fetch(apiUrl(path), { ...options, signal: controller.signal })
  } catch {
    if (externalSignal?.aborted && !timedOut) throw new Error('The request was cancelled.')
    const elapsed = Date.now() - startedAt
    throw new Error(timedOut || elapsed >= SLOW_REQUEST_MS
      ? SERVER_STARTING_MESSAGE
      : SERVER_UNAVAILABLE_MESSAGE)
  } finally {
    window.clearTimeout(slowTimer)
    window.clearTimeout(timeoutTimer)
    externalSignal?.removeEventListener('abort', abortFromCaller)
    if (slowRequestReported) reportSlowRequest(false)
  }
}

async function readJsonBody<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!/^(application\/json|[\w.+-]+\/[\w.+-]+\+json)(?:\s*;|$)/i.test(contentType.trim())) return null
  try {
    return await response.json() as T
  } catch {
    return null
  }
}

async function responseError(response: Response, elapsed: number, fallback: string) {
  const body = await readJsonBody<{ error?: { code?: string; message?: string } }>(response)
  if (body?.error?.code === 'EMAIL_NOT_CONFIGURED' && body.error.message) {
    return new Error(body.error.message)
  }
  if (response.status === 404 || response.status >= 500) {
    return new Error(elapsed >= SLOW_REQUEST_MS ? SERVER_STARTING_MESSAGE : SERVER_UNAVAILABLE_MESSAGE)
  }
  const message = body?.error?.message
  if (message && !/(?:^|\n)\s*(?:Error|SyntaxError|TypeError):|\bat\s.+:\d+:\d+\)?|unexpected token|unexpected end of (?:json|input)|json parse/i.test(message)) {
    return new Error(message)
  }
  return new Error(fallback)
}

function invalidResponseError() {
  return new Error("The server couldn't complete your request. Try again in a moment.")
}

export class CameraFrameError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'CameraFrameError'
    this.code = code
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function storeSession(user: User, access: string, refresh: string) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearSession() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

function expireSession() {
  clearSession()
  window.dispatchEvent(new Event('sas:session-expired'))
}

function getStoredAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

async function authenticatedFetch(path: string, options: RequestInit = {}) {
  const send = () => {
    const headers = new Headers(options.headers)
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    const token = getStoredAccessToken()
    const user = getStoredUser()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (user?.organizationId) headers.set('X-Organization-Id', user.organizationId)
    return apiFetch(path, { ...options, headers })
  }

  const startedAt = Date.now()
  let res = await send()
  if (res.status === 401 && !path.endsWith('/auth/refresh') && !path.endsWith('/auth/logout')) {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (refreshToken) {
      const refreshResponse = await apiFetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (refreshResponse.ok) {
        const refreshBody = await readJsonBody<{ data?: { user?: User; accessToken?: string; refreshToken?: string } }>(refreshResponse)
        const session = refreshBody?.data
        if (session?.user && session.accessToken && session.refreshToken) {
          storeSession(session.user, session.accessToken, session.refreshToken)
          res = await send()
        } else {
          expireSession()
          throw invalidResponseError()
        }
      } else if (refreshResponse.status === 401) {
        expireSession()
      } else {
        throw await responseError(refreshResponse, Date.now() - startedAt, 'Could not refresh the sign-in session.')
      }
    } else {
      expireSession()
    }
    if (res.status === 401) expireSession()
  }
  return res
}

async function backendRequest<T>(path: string, options: RequestInit = {}) {
  const startedAt = Date.now()
  const res = await authenticatedFetch(path, options)
  if (!res.ok) throw await responseError(res, Date.now() - startedAt, 'The request could not be completed.')
  const body = await readJsonBody<{ data?: T }>(res)
  if (!body || body.data === undefined) throw invalidResponseError()
  return body.data
}

export function connectLiveFeed(onScan: (scan: ScanEvent) => void, onError: (error: Error) => void) {
  const controller = new AbortController()
  let lastEventId = ''

  async function refreshForStream() {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) {
      expireSession()
      return false
    }
    const startedAt = Date.now()
    const response = await apiFetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    })
    if (!response.ok) {
      if (response.status === 401) {
        expireSession()
        return false
      }
      throw await responseError(response, Date.now() - startedAt, 'Could not refresh the sign-in session.')
    }
    const body = await readJsonBody<{ data?: { user?: User; accessToken?: string; refreshToken?: string } }>(response)
    if (!body?.data?.user || !body.data.accessToken || !body.data.refreshToken) {
      expireSession()
      throw invalidResponseError()
    }
    storeSession(body.data.user, body.data.accessToken, body.data.refreshToken)
    return true
  }

  async function consume() {
    let retryDelay = 1000
    while (!controller.signal.aborted) {
      try {
        const headers = new Headers()
        const token = getStoredAccessToken()
        const user = getStoredUser()
        if (token) headers.set('Authorization', `Bearer ${token}`)
        if (user?.organizationId) headers.set('X-Organization-Id', user.organizationId)
        if (lastEventId) headers.set('Last-Event-ID', lastEventId)
        let startedAt = Date.now()
        let response = await apiFetch('/api/v1/events/live', { headers, signal: controller.signal })
        if (response.status === 401 && await refreshForStream()) {
          headers.set('Authorization', `Bearer ${getStoredAccessToken()}`)
          startedAt = Date.now()
          response = await apiFetch('/api/v1/events/live', { headers, signal: controller.signal })
        }
        if (!response.ok || !response.body) {
          if (!response.ok) throw await responseError(response, Date.now() - startedAt, 'The live feed is unavailable.')
          throw invalidResponseError()
        }
        retryDelay = 1000
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let pending = ''
        try {
          while (!controller.signal.aborted) {
            const { value, done } = await reader.read()
            if (done) break
            pending += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
            let boundary = pending.indexOf('\n\n')
            while (boundary >= 0) {
              const frame = pending.slice(0, boundary)
              pending = pending.slice(boundary + 2)
              let eventId = ''
              let data = ''
              for (const line of frame.split('\n')) {
                if (line.startsWith('id:')) eventId = line.slice(3).trim()
                if (line.startsWith('data:')) data += line.slice(5).trim()
              }
              if (eventId) lastEventId = eventId
              if (data) {
                let scan: ScanEvent
                try {
                  scan = JSON.parse(data) as ScanEvent
                } catch {
                  throw new Error('The live feed returned an invalid response.')
                }
                onScan(scan)
              }
              boundary = pending.indexOf('\n\n')
            }
          }
        } finally {
          reader.releaseLock()
        }
      } catch (error) {
        if (controller.signal.aborted) return
        onError(error instanceof Error && (
          error.message === SERVER_UNAVAILABLE_MESSAGE ||
          error.message === SERVER_STARTING_MESSAGE ||
          error.message === 'The live feed returned an invalid response.' ||
          error.message === 'The live feed is unavailable.'
        ) ? error : new Error(SERVER_UNAVAILABLE_MESSAGE))
      }
      await new Promise((resolve) => window.setTimeout(resolve, retryDelay))
      retryDelay = Math.min(retryDelay * 2, 15000)
    }
  }

  void consume()
  return () => controller.abort()
}

type BackendLoginResult =
  | { organizationSelectionRequired: true; organizations: Array<{ id: string; name: string }> }
  | { organizationSelectionRequired: false; user: User; accessToken: string; refreshToken: string }

async function backendLogin(email: string, password: string, organizationId?: string): Promise<BackendLoginResult> {
  const startedAt = Date.now()
  const res = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, organizationId }),
  })
  if (!res.ok) throw await responseError(res, Date.now() - startedAt, 'Could not sign in.')
  const body = await readJsonBody<{
    data?: {
      user?: User
      accessToken?: string
      refreshToken?: string
      organizationSelectionRequired?: boolean
      organizations?: Array<{ id: string; name: string }>
    }
  }>(res)
  if (!body) throw invalidResponseError()
  const data = body.data
  if (data?.organizationSelectionRequired && data.organizations) {
    return { organizationSelectionRequired: true, organizations: data.organizations }
  }
  const { user, accessToken, refreshToken } = data ?? {}
  if (!user || !accessToken || !refreshToken) throw invalidResponseError()
  return { user, accessToken, refreshToken, organizationSelectionRequired: false as const }
}

export const api = {
  async login(email: string, password: string, organizationId?: string) {
    return backendLogin(email, password, organizationId)
  },
  async acceptInvitation(code: string, password: string) {
    const startedAt = Date.now()
    const response = await apiFetch('/api/v1/auth/accept-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, password }),
    })
    if (!response.ok) {
      throw await responseError(response, Date.now() - startedAt, 'Could not accept invitation.')
    }
    const body = await readJsonBody<{
      data?: { user?: User; accessToken?: string; refreshToken?: string }
    }>(response)
    const { user, accessToken, refreshToken } = body?.data ?? {}
    if (!user || !accessToken || !refreshToken) throw invalidResponseError()
    return { user, accessToken, refreshToken }
  },
  logout() {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    const request = refreshToken
      ? backendRequest('/api/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        })
      : Promise.resolve()
    return request.finally(clearSession)
  },
  forgotPassword(email: string) {
    return backendRequest<{ message: string; developmentResetUrl?: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },
  resetPassword(token: string, newPassword: string) {
    return backendRequest<{ passwordUpdated: boolean }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  },
  changePassword(currentPassword: string, newPassword: string) {
    return backendRequest<{ passwordUpdated: boolean; sessionsRevoked: boolean }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },
  dashboard() {
    return backendRequest<DashboardStats>('/api/v1/dashboard')
  },
  courses() {
    return backendRequest<Course[]>('/api/v1/courses')
  },
  timetable() {
    return backendRequest<ScheduleSlot[]>('/api/v1/timetable')
  },
  shifts() {
    return backendRequest<Shift[]>('/api/v1/shifts')
  },
  holidays() {
    return backendRequest<Holiday[]>('/api/v1/holidays')
  },
  adminUsers() {
    return backendRequest<User[]>('/api/v1/users?limit=100')
  },
  organizations() {
    return backendRequest<ManagedOrganization[]>('/api/v1/organizations')
  },
  createOrganization(input: {
    name: string
    slug: string
    mode: ManagedOrganization['mode']
    adminName: string
    adminEmail: string
  }) {
    return backendRequest<{
      organization: ManagedOrganization
      adminInvite: { email: string; code: string; expiresAt: string }
    }>('/api/v1/organizations', { method: 'POST', body: JSON.stringify(input) })
  },
  createOrganizationAdminInvitation(id: string, input: { name: string; email: string }) {
    return backendRequest<{ email: string; code: string; expiresAt: string }>(
      `/api/v1/organizations/${encodeURIComponent(id)}/admin-invitations`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  },
  organizationAdminInvitations(id: string) {
    return backendRequest<Array<Pick<PendingInvitation, 'id' | 'email' | 'name' | 'expiresAt' | 'createdAt'>>>(
      `/api/v1/organizations/${encodeURIComponent(id)}/admin-invitations`,
    )
  },
  revokeOrganizationAdminInvitation(organizationId: string, invitationId: string) {
    return backendRequest<{ id: string; revokedAt: string }>(
      `/api/v1/organizations/${encodeURIComponent(organizationId)}/admin-invitations/${encodeURIComponent(invitationId)}`,
      { method: 'DELETE' },
    )
  },
  createInvitation(input: { name: string; email: string; role: Exclude<Role, 'SUPER_ADMIN'>; groupIds: string[] }) {
    return backendRequest<CreatedInvitation>('/api/v1/invitations', { method: 'POST', body: JSON.stringify(input) })
  },
  pendingInvitations() {
    return backendRequest<PendingInvitation[]>('/api/v1/invitations')
  },
  revokeInvitation(id: string) {
    return backendRequest<{ id: string; revokedAt: string }>(`/api/v1/invitations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
  setOrganizationStatus(id: string, status: ManagedOrganization['status']) {
    return backendRequest<ManagedOrganization>(`/api/v1/organizations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  directoryPeople(filters: { q?: string; type?: string; groupId?: string } = {}) {
    const params = new URLSearchParams({ limit: '100' })
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value)
    }
    return backendRequest<Person[]>(`/api/v1/people?${params.toString()}`)
  },
  directoryPerson(id: string) {
    return backendRequest<Person>(`/api/v1/people/${encodeURIComponent(id)}`)
  },
  cameraTemplates(groupId: string) {
    return backendRequest<Array<{
      personId: string
      name: string
      personCode: string
      consentGiven: boolean
      cameraConsentGiven: boolean
      enrolled: boolean
    }>>(`/api/v1/camera/templates?groupId=${encodeURIComponent(groupId)}`)
  },
  enrollCameraFace(personId: string, descriptors: number[][], cameraConsentConfirmed: boolean) {
    return backendRequest<{ personId: string; enrolledAt: string }>('/api/v1/camera/templates', {
      method: 'POST',
      body: JSON.stringify({ personId, descriptors, cameraConsentConfirmed }),
    })
  },
  deleteCameraFace(personId: string) {
    return backendRequest<{ personId: string; deleted: boolean }>(
      `/api/v1/camera/templates/${encodeURIComponent(personId)}`,
      { method: 'DELETE' },
    )
  },
  recognizeCameraFace(groupId: string, descriptor: number[]) {
    return backendRequest<
      | { matched: false; reason: 'NO_MATCH' | 'AMBIGUOUS' }
      | {
          matched: true
          person: { id: string; name: string; personCode: string }
          confidence: number
          attendance: { id: string; date: string; status: string; alreadyRecorded: boolean }
        }
    >('/api/v1/camera/recognize', {
      method: 'POST',
      body: JSON.stringify({ groupId, descriptor }),
    })
  },
  async amb82CameraFrame(signal?: AbortSignal) {
    const startedAt = Date.now()
    const response = await authenticatedFetch('/api/v1/camera/amb82/frame', { signal })
    if (!response.ok) {
      const body = await readJsonBody<{ error?: { code?: string } }>(response)
      const error = await responseError(response, Date.now() - startedAt, 'Could not load the AMB82 camera frame.')
      throw new CameraFrameError(
        error.message,
        body?.error?.code ?? 'CAMERA_STREAM_ERROR',
      )
    }
    if (!response.headers.get('content-type')?.startsWith('image/jpeg')) {
      throw new CameraFrameError('The camera endpoint returned an invalid frame.', 'INVALID_CAMERA_FRAME')
    }
    return response.blob()
  },
  amb82CameraConfig() {
    return backendRequest<{ url: string | null; configured: boolean }>('/api/v1/camera/amb82/config')
  },
  updateAmb82CameraConfig(url: string) {
    return backendRequest<{ url: string; configured: boolean }>('/api/v1/camera/amb82/config', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  },
  personAttendance(id: string) {
    return backendRequest<AttendanceRecord[]>(`/api/v1/people/${encodeURIComponent(id)}/attendance?limit=100`)
  },
  createDirectoryLeave(input: Pick<LeaveRequest, 'personId' | 'from' | 'to' | 'type' | 'reason'>) {
    return backendRequest<LeaveRequest>('/api/v1/leave', { method: 'POST', body: JSON.stringify(input) })
  },
  createDirectoryPerson(input: Omit<Person, 'id'>) {
    return backendRequest<Person>('/api/v1/people', { method: 'POST', body: JSON.stringify(input) })
  },
  updateDirectoryPerson(id: string, input: Partial<Omit<Person, 'id'>>) {
    return backendRequest<Person>(`/api/v1/people/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
  directoryGroups() {
    return backendRequest<Group[]>('/api/v1/groups?limit=100')
  },
  directorySites() {
    return backendRequest<Array<{ id: string; siteCode: string; name: string; status: 'ACTIVE' | 'INACTIVE' }>>('/api/v1/sites')
  },
  createDirectoryGroup(input: Pick<Group, 'name' | 'kind'> & Partial<Pick<Group, 'parentId' | 'supervisorUserId'>>) {
    return backendRequest<Group>('/api/v1/groups', { method: 'POST', body: JSON.stringify(input) })
  },
  updateDirectoryGroup(
    id: string,
    input: Partial<Pick<Group, 'name' | 'kind' | 'parentId' | 'supervisorUserId'>> & { status?: 'ACTIVE' | 'ARCHIVED' },
  ) {
    return backendRequest<Group>(`/api/v1/groups/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
  directorySettings() {
    return backendRequest<OrgSettings>('/api/v1/settings')
  },
  createCourse(input: Omit<Course, 'id'>) {
    return backendRequest<Course>('/api/v1/courses', { method: 'POST', body: JSON.stringify(input) })
  },
  createScheduleSlot(input: Omit<ScheduleSlot, 'id'>) {
    return backendRequest<ScheduleSlot>('/api/v1/timetable', { method: 'POST', body: JSON.stringify(input) })
  },
  archiveScheduleSlot(id: string) {
    return backendRequest<ScheduleSlot>(`/api/v1/timetable/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ARCHIVED' }),
    })
  },
  createShift(input: Omit<Shift, 'id'>) {
    return backendRequest<Shift>('/api/v1/shifts', { method: 'POST', body: JSON.stringify(input) })
  },
  createHoliday(input: Omit<Holiday, 'id'>) {
    return backendRequest<Holiday>('/api/v1/holidays', { method: 'POST', body: JSON.stringify(input) })
  },
  attendanceReport(filters: { from?: string; to?: string; groupId?: string; status?: string } = {}) {
    const params = new URLSearchParams({ limit: '100' })
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
    return backendRequest<AttendanceRecord[]>(`/api/v1/reports/attendance?${params.toString()}`)
  },
  attendanceRecords(filters: { date?: string; status?: string } = {}) {
    const params = new URLSearchParams({ limit: '100' })
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
    return backendRequest<AttendanceRecord[]>(`/api/v1/attendance?${params.toString()}`)
  },
  myAttendance() {
    return backendRequest<AttendanceRecord[]>('/api/v1/my-attendance?limit=100')
  },
  correctDirectoryAttendance(id: string, status: AttendanceRecord['status'], reason: string) {
    return backendRequest<AttendanceRecord>(`/api/v1/attendance/${encodeURIComponent(id)}/corrections`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    })
  },
  createManualAttendance(input: {
    personId: string
    date: string
    status: AttendanceRecord['status']
    reason: string
  }) {
    return backendRequest<AttendanceRecord>('/api/v1/attendance', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  directoryExceptions() {
    return backendRequest<ScanEvent[]>('/api/v1/exceptions?limit=100')
  },
  resolveDirectoryException(eventId: string, note: string) {
    return backendRequest<{ eventId: string; status: string; note: string }>(
      `/api/v1/exceptions/${encodeURIComponent(eventId)}/resolve`,
      { method: 'POST', body: JSON.stringify({ note }) },
    )
  },
  directoryLeave() {
    return backendRequest<LeaveRequest[]>('/api/v1/leave?limit=100')
  },
  reviewDirectoryLeave(id: string, status: 'APPROVED' | 'REJECTED') {
    return backendRequest<{ id: string; status: string }>(`/api/v1/leave/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  directoryNotifications() {
    return backendRequest<NotificationItem[]>('/api/v1/notifications?limit=100')
  },
  markDirectoryNotifications(ids: string[], read: boolean) {
    return backendRequest<{ updated: number }>('/api/v1/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ ids, read }),
    })
  },
  directoryAudit() {
    return backendRequest<AuditLog[]>('/api/v1/audit?limit=100')
  },
  directoryDeletionRequests() {
    return backendRequest<Array<{ id: string; personId: string; status: string; reason: string }>>('/api/v1/privacy/deletion-requests?limit=100')
  },
  createDirectoryDeletionRequest(personId: string, reason: string) {
    return backendRequest<{ id: string; status: string }>('/api/v1/privacy/deletion-requests', {
      method: 'POST',
      body: JSON.stringify({ personId, reason }),
    })
  },
  reviewDirectoryDeletionRequest(id: string, status: 'APPROVED' | 'REJECTED', reviewNote: string) {
    return backendRequest<{ id: string; status: string; reviewNote: string }>(`/api/v1/privacy/deletion-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNote }),
    })
  },
  async downloadAttendanceReport(filters: { from?: string; to?: string; groupId?: string }, format: 'csv' | 'xlsx') {
    const params = new URLSearchParams({ format })
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
    const headers = new Headers()
    const token = getStoredAccessToken()
    const user = getStoredUser()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (user?.organizationId) headers.set('X-Organization-Id', user.organizationId)
    const startedAt = Date.now()
    const response = await authenticatedFetch(`/api/v1/reports/attendance/export?${params.toString()}`, { headers })
    if (!response.ok) {
      throw await responseError(response, Date.now() - startedAt, 'Could not export attendance report.')
    }
    return response.blob()
  },
  reportSchedules() {
    return backendRequest<Array<{
      id: string
      name: string
      format: 'CSV' | 'XLSX'
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
      weekday: number | null
      monthDay: number | null
      localTime: string
      timezone: string
      recipients: string[]
      status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
      nextRunAt: string
      lastRunAt: string | null
    }>>('/api/v1/reports/schedules')
  },
  createReportSchedule(input: {
    name: string
    format: 'CSV' | 'XLSX'
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    weekday?: number
    monthDay?: number
    localTime: string
    timezone: string
    recipients: string[]
  }) {
    return backendRequest<{ id: string; status: string; nextRunAt: string }>('/api/v1/reports/schedules', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  updateReportSchedule(id: string, status: 'ACTIVE' | 'PAUSED') {
    return backendRequest<{ id: string; status: string; nextRunAt: string }>(`/api/v1/reports/schedules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  deleteReportSchedule(id: string) {
    return backendRequest<{ id: string; status: string }>(`/api/v1/reports/schedules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
  saveDirectorySettings(next: OrgSettings) {
    return backendRequest<OrgSettings>('/api/v1/settings', { method: 'PATCH', body: JSON.stringify(next) })
  },
  previewPeopleImport(csv: string, assignGroupId?: string) {
    const query = assignGroupId ? `?assignGroupId=${encodeURIComponent(assignGroupId)}` : ''
    return backendRequest<{
      totalRows: number
      validCount: number
      invalidCount: number
      rows: Array<{ row: number; valid: boolean; errors: string[]; data: Omit<Person, 'id'> }>
    }>(`/api/v1/people/import/preview${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csv,
    })
  },
  commitPeopleImport(csv: string, idempotencyKey: string, assignGroupId?: string) {
    const query = assignGroupId ? `?assignGroupId=${encodeURIComponent(assignGroupId)}` : ''
    return backendRequest<{ created: number; skipped: number; rowResults: Array<{ row: number; status: string; error?: string }> }>(
      `/api/v1/people/import${query}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv', 'Idempotency-Key': idempotencyKey },
        body: csv,
      },
    )
  },
}
