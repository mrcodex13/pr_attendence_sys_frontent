import type {
  AttendanceRecord,
  AuditLog,
  Correction,
  Course,
  DashboardStats,
  Device,
  FaceEnrollment,
  Group,
  Holiday,
  LeaveRequest,
  NotificationItem,
  OrgSettings,
  Person,
  ScanEvent,
  ScheduleSlot,
  Shift,
  User,
} from '../../types/domain'

const now = Date.now()
const today = new Date().toISOString().slice(0, 10)

function ago(ms: number) {
  return new Date(now - ms).toISOString()
}

export const demoUsers: Array<User & { password: string }> = [
  {
    id: 'u-super',
    name: 'Riya Kapoor',
    email: 'riya@campus.edu',
    role: 'SUPER_ADMIN',
    groupIds: [],
    password: 'Attend@123',
  },
  {
    id: 'u-admin',
    name: 'Office Admin',
    email: 'office@campus.edu',
    role: 'ADMIN',
    groupIds: [],
    password: 'Attend@123',
  },
  {
    id: 'u-teacher',
    name: 'Ananya Sharma',
    email: 'ananya@campus.edu',
    role: 'TEACHER',
    groupIds: ['g-cse4'],
    password: 'Attend@123',
  },
  {
    id: 'u-manager',
    name: 'Vikram Rao',
    email: 'vikram@campus.edu',
    role: 'MANAGER',
    groupIds: ['g-ops'],
    password: 'Attend@123',
  },
]

export const groups: Group[] = [
  { id: 'g-cse4', name: 'CSE · 4th Sem', kind: 'CLASS', supervisorUserId: 'u-teacher' },
  { id: 'g-iot3', name: 'IoT · 3rd Sem', kind: 'CLASS' },
  { id: 'g-ops', name: 'Operations', kind: 'TEAM', supervisorUserId: 'u-manager' },
  { id: 'g-hr', name: 'Human Resources', kind: 'DEPARTMENT' },
]

export const people: Person[] = [
  {
    id: 'p1',
    personCode: 'STU-1001',
    type: 'STUDENT',
    name: 'Rahul Sharma',
    email: 'rahul@campus.edu',
    phone: '9876543210',
    status: 'ACTIVE',
    groupId: 'g-cse4',
    rollNumber: 'CS2021001',
    semester: '4',
    consentGiven: true,
  },
  {
    id: 'p2',
    personCode: 'STU-1002',
    type: 'STUDENT',
    name: 'Priya Patel',
    email: 'priya@campus.edu',
    phone: '9876543211',
    status: 'ACTIVE',
    groupId: 'g-cse4',
    rollNumber: 'CS2021002',
    semester: '4',
    consentGiven: true,
  },
  {
    id: 'p3',
    personCode: 'STU-1003',
    type: 'STUDENT',
    name: 'Aman Singh',
    email: 'aman@campus.edu',
    phone: '9876543212',
    status: 'ACTIVE',
    groupId: 'g-cse4',
    rollNumber: 'CS2021003',
    semester: '4',
    consentGiven: true,
  },
  {
    id: 'p4',
    personCode: 'STU-1004',
    type: 'STUDENT',
    name: 'Neha Gupta',
    email: 'neha@campus.edu',
    phone: '9876543213',
    status: 'ACTIVE',
    groupId: 'g-iot3',
    rollNumber: 'IT231001',
    semester: '3',
    consentGiven: true,
  },
  {
    id: 'p5',
    personCode: 'STU-1005',
    type: 'STUDENT',
    name: 'Aarav Mehta',
    email: 'aarav@campus.edu',
    phone: '9800000001',
    status: 'INACTIVE',
    groupId: 'g-iot3',
    rollNumber: 'IT231002',
    semester: '3',
    consentGiven: false,
  },
  {
    id: 'p6',
    personCode: 'EMP-2001',
    type: 'EMPLOYEE',
    name: 'Kajal Verma',
    email: 'kajal@campus.edu',
    phone: '9876543215',
    status: 'ACTIVE',
    groupId: 'g-ops',
    employeeId: 'EMP-2001',
    designation: 'Operations Associate',
    consentGiven: true,
  },
  {
    id: 'p7',
    personCode: 'EMP-2002',
    type: 'EMPLOYEE',
    name: 'Vivek Yadav',
    email: 'vivek@campus.edu',
    phone: '9876543214',
    status: 'ACTIVE',
    groupId: 'g-hr',
    employeeId: 'EMP-2002',
    designation: 'HR Executive',
    consentGiven: true,
  },
]

export const courses: Course[] = [
  { id: 'c1', name: 'Data Structures', code: 'CS301', groupId: 'g-cse4', teacherUserId: 'u-teacher' },
  { id: 'c2', name: 'Embedded Systems', code: 'IT210', groupId: 'g-iot3', teacherUserId: 'u-teacher' },
]

export const timetable: ScheduleSlot[] = [
  { id: 's1', courseId: 'c1', weekday: 1, start: '09:00', end: '10:00', room: 'A-201' },
  { id: 's2', courseId: 'c1', weekday: 3, start: '11:00', end: '12:00', room: 'A-201' },
  { id: 's3', courseId: 'c2', weekday: 2, start: '09:30', end: '10:30', room: 'Lab-2' },
]

export const shifts: Shift[] = [
  { id: 'sh1', name: 'Office day', start: '09:30', end: '18:00', graceMinutes: 10, workingDays: [1, 2, 3, 4, 5] },
]

export const holidays: Holiday[] = [
  { id: 'h1', date: '2026-10-20', name: 'Diwali break', siteId: 'site-main' },
]

export const devices: Device[] = [
  {
    id: 'd1',
    deviceCode: 'GATE-01',
    name: 'Main Gate',
    siteId: 'site-main',
    location: 'Entrance',
    direction: 'EITHER',
    status: 'ACTIVE',
    health: 'ONLINE',
    lastSeenAt: ago(20_000),
    firmwareVersion: '1.2.0',
    configVersion: 4,
    queueDepth: 0,
    wifiRssi: -48,
  },
  {
    id: 'd2',
    deviceCode: 'A201-01',
    name: 'Classroom A-201',
    siteId: 'site-main',
    location: 'A-201',
    direction: 'IN',
    status: 'ACTIVE',
    health: 'STALE',
    lastSeenAt: ago(8 * 60_000),
    firmwareVersion: '1.2.0',
    configVersion: 4,
    queueDepth: 3,
    wifiRssi: -67,
  },
  {
    id: 'd3',
    deviceCode: 'OPS-01',
    name: 'Ops entrance',
    siteId: 'site-main',
    location: 'Ops floor',
    direction: 'IN',
    status: 'ACTIVE',
    health: 'OFFLINE',
    lastSeenAt: ago(42 * 60_000),
    firmwareVersion: '1.1.4',
    configVersion: 3,
    queueDepth: 18,
    wifiRssi: -81,
  },
]

export const enrollments: FaceEnrollment[] = [
  { id: 'e1', personId: 'p1', deviceId: 'd1', status: 'ENROLLED', enrolledAt: ago(86400_000) },
  { id: 'e2', personId: 'p1', deviceId: 'd2', status: 'PENDING' },
  { id: 'e3', personId: 'p2', deviceId: 'd1', status: 'ENROLLED', enrolledAt: ago(2 * 86400_000) },
  { id: 'e4', personId: 'p6', deviceId: 'd3', status: 'FAILED' },
]

export const scans: ScanEvent[] = [
  {
    eventId: 'evt-1',
    deviceId: 'd1',
    personId: 'p1',
    rawLabel: 'STU-1001',
    confidence: 0.94,
    scannedAt: ago(90_000),
    receivedAt: ago(89_000),
    result: 'ACCEPTED',
    direction: 'IN',
    displayName: 'Rahul Sharma',
  },
  {
    eventId: 'evt-2',
    deviceId: 'd1',
    personId: 'p2',
    rawLabel: 'STU-1002',
    confidence: 0.91,
    scannedAt: ago(80_000),
    receivedAt: ago(79_000),
    result: 'ACCEPTED',
    direction: 'IN',
    displayName: 'Priya Patel',
  },
  {
    eventId: 'evt-3',
    deviceId: 'd2',
    personId: 'p3',
    rawLabel: 'STU-1003',
    confidence: 0.88,
    scannedAt: ago(70_000),
    receivedAt: ago(70_000),
    result: 'ACCEPTED',
    direction: 'IN',
    displayName: 'Aman Singh',
  },
  {
    eventId: 'evt-4',
    deviceId: 'd1',
    rawLabel: 'UNKNOWN',
    confidence: 0.41,
    scannedAt: ago(55_000),
    receivedAt: ago(54_000),
    result: 'UNKNOWN_PERSON',
    direction: 'IN',
    displayName: 'Unknown face',
  },
  {
    eventId: 'evt-5',
    deviceId: 'd1',
    personId: 'p5',
    rawLabel: 'STU-1005',
    confidence: 0.9,
    scannedAt: ago(40_000),
    receivedAt: ago(40_000),
    result: 'INACTIVE_PERSON',
    direction: 'IN',
    displayName: 'Aarav Mehta',
  },
  {
    eventId: 'evt-6',
    deviceId: 'd2',
    personId: 'p4',
    rawLabel: 'STU-1004',
    confidence: 0.52,
    scannedAt: ago(25_000),
    receivedAt: ago(25_000),
    result: 'LOW_CONFIDENCE',
    direction: 'IN',
    displayName: 'Neha Gupta',
  },
]

export const records: AttendanceRecord[] = [
  {
    id: 'r1',
    personId: 'p1',
    date: today,
    status: 'PRESENT',
    firstIn: ago(90_000),
    source: 'DEVICE',
    derivedFromEventIds: ['evt-1'],
  },
  {
    id: 'r2',
    personId: 'p2',
    date: today,
    status: 'PRESENT',
    firstIn: ago(80_000),
    source: 'DEVICE',
    derivedFromEventIds: ['evt-2'],
  },
  {
    id: 'r3',
    personId: 'p3',
    date: today,
    status: 'LATE',
    firstIn: ago(70_000),
    source: 'DEVICE',
    derivedFromEventIds: ['evt-3'],
  },
  {
    id: 'r4',
    personId: 'p4',
    date: today,
    status: 'ABSENT',
    source: 'DEVICE',
    derivedFromEventIds: [],
  },
  {
    id: 'r5',
    personId: 'p6',
    date: today,
    status: 'PRESENT',
    firstIn: ago(3 * 3600_000),
    lastOut: ago(600_000),
    minutesWorked: 480,
    source: 'DEVICE',
    derivedFromEventIds: [],
  },
]

export const corrections: Correction[] = []

export const leaveRequests: LeaveRequest[] = [
  {
    id: 'l1',
    personId: 'p4',
    from: today,
    to: today,
    type: 'SICK',
    status: 'PENDING',
    reason: 'Fever',
  },
  {
    id: 'l2',
    personId: 'p7',
    from: today,
    to: new Date(now + 86400_000).toISOString().slice(0, 10),
    type: 'CASUAL',
    status: 'APPROVED',
    reason: 'Family function',
  },
]

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Unknown face detected',
    description: 'Main Gate · exceptions queue',
    time: 'Just now',
    tone: 'red',
    icon: 'alert',
    read: false,
  },
  {
    id: 'n2',
    title: 'Ops entrance offline',
    description: 'No heartbeat for 42 minutes · queue 18',
    time: '42 min ago',
    tone: 'amber',
    icon: 'camera',
    read: false,
  },
  {
    id: 'n3',
    title: 'Enrollment completed',
    description: 'Priya Patel enrolled on GATE-01',
    time: '1 hour ago',
    tone: 'green',
    icon: 'check',
    read: true,
  },
]

export const auditLogs: AuditLog[] = [
  {
    id: 'a1',
    at: ago(120_000),
    actor: 'Office Admin',
    action: 'DEVICE_REGISTER',
    entity: 'GATE-01',
    detail: 'Registered Main Gate',
  },
  {
    id: 'a2',
    at: ago(3_600_000),
    actor: 'Riya Kapoor',
    action: 'PERSON_CREATE',
    entity: 'STU-1001',
    detail: 'Added Rahul Sharma',
  },
]

export const settings: OrgSettings = {
  name: 'PR Campus',
  mode: 'BOTH',
  timezone: 'Asia/Kolkata',
  graceMinutes: 10,
  debounceSeconds: 60,
  minConfidence: 0.72,
  retentionDays: 365,
}

let revealedSecret: string | null = null
const resolvedExceptionIds = new Set<string>()

export const mockApi = {
  login(email: string, password: string) {
    const user = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (!user) throw new Error('Invalid email or password.')
    const { password: _pw, ...safe } = user
    void _pw
    return { user: safe, accessToken: `mock.${safe.id}`, refreshToken: `refresh.${safe.id}` }
  },
  stats(scopeGroupIds?: string[]): DashboardStats {
    const scopedPeople = scopeGroupIds?.length ? people.filter((p) => scopeGroupIds.includes(p.groupId)) : people
    const scopedRecords = records.filter((r) => scopedPeople.some((p) => p.id === r.personId) && r.date === today)
    const present = scopedRecords.filter((r) => r.status === 'PRESENT').length
    const late = scopedRecords.filter((r) => r.status === 'LATE').length
    const absent = scopedRecords.filter((r) => r.status === 'ABSENT').length
    const excused = scopedRecords.filter((r) => r.status === 'EXCUSED').length
    return {
      present,
      late,
      absent,
      excused,
      people: scopedPeople.filter((p) => p.status === 'ACTIVE').length,
      exceptions: scans.filter((s) => s.result !== 'ACCEPTED' && s.result !== 'DUPLICATE').length,
      rate: scopedRecords.length ? Math.round(((present + late + excused) / scopedRecords.length) * 100) : 0,
      trend: [
        { day: 'Mon', present: 86, late: 8 },
        { day: 'Tue', present: 90, late: 6 },
        { day: 'Wed', present: 84, late: 9 },
        { day: 'Thu', present: 88, late: 7 },
        { day: 'Fri', present: 91, late: 5 },
        { day: 'Sat', present: 40, late: 2 },
        { day: 'Sun', present: 12, late: 0 },
      ],
      groupRates: groups.map((g) => ({
        name: g.name.split('·')[0].trim().slice(0, 8),
        rate: 82 + (g.id.length % 12),
      })),
      topAbsentees: [
        { name: 'Aarav Mehta', days: 6 },
        { name: 'Aman Singh', days: 4 },
        { name: 'Neha Gupta', days: 3 },
      ],
    }
  },
  people() {
    return people
  },
  person(id: string) {
    return people.find((p) => p.id === id)
  },
  addPerson(input: Omit<Person, 'id'>) {
    const person: Person = { ...input, id: `p${people.length + 1}` }
    people.unshift(person)
    auditLogs.unshift({
      id: `a${auditLogs.length + 1}`,
      at: new Date().toISOString(),
      actor: 'Current user',
      action: 'PERSON_CREATE',
      entity: person.personCode,
      detail: `Added ${person.name}`,
    })
    return person
  },
  groups() {
    return groups
  },
  devices() {
    return devices
  },
  device(id: string) {
    return devices.find((d) => d.id === id)
  },
  registerDevice(input: Pick<Device, 'deviceCode' | 'name' | 'location' | 'direction'>) {
    const device: Device = {
      ...input,
      id: `d${devices.length + 1}`,
      siteId: 'site-main',
      status: 'ACTIVE',
      health: 'OFFLINE',
      lastSeenAt: '',
      firmwareVersion: '—',
      configVersion: 1,
      queueDepth: 0,
      wifiRssi: 0,
    }
    devices.unshift(device)
    revealedSecret = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
    return { device, secret: revealedSecret }
  },
  simulateAuthenticatedHeartbeat(deviceId: string, actor: string) {
    const device = devices.find((d) => d.id === deviceId)
    if (!device) throw new Error('Device not found')
    const previousHealth = device.health
    device.health = 'ONLINE'
    device.lastSeenAt = new Date().toISOString()
    auditLogs.unshift({
      id: `a${auditLogs.length + 1}`,
      at: device.lastSeenAt,
      actor,
      action: 'DEVICE_HEARTBEAT_VERIFIED',
      entity: device.deviceCode,
      detail: `Authenticated heartbeat verified${previousHealth === 'OFFLINE' ? ' after offline status' : ''}.`,
    })
    return device
  },
  enrollments() {
    return enrollments
  },
  startEnrollment(personId: string, deviceId: string) {
    const existing = enrollments.find((e) => e.personId === personId && e.deviceId === deviceId)
    if (existing) {
      existing.status = 'PENDING'
      return existing
    }
    const row: FaceEnrollment = {
      id: `e${enrollments.length + 1}`,
      personId,
      deviceId,
      status: 'PENDING',
    }
    enrollments.push(row)
    return row
  },
  completeEnrollment(id: string, success: boolean) {
    const row = enrollments.find((e) => e.id === id)
    if (!row) return
    row.status = success ? 'ENROLLED' : 'FAILED'
    row.enrolledAt = success ? new Date().toISOString() : undefined
    return row
  },
  scans() {
    return scans
  },
  records() {
    return records
  },
  exceptions() {
    return scans.filter((s) => !['ACCEPTED', 'DUPLICATE'].includes(s.result) && !resolvedExceptionIds.has(s.eventId))
  },
  resolveException(eventId: string, note: string, actor: string) {
    const scan = scans.find((s) => s.eventId === eventId)
    if (!scan) throw new Error('Scan event not found')
    const resolutionNote = note.trim()
    if (!resolutionNote) throw new Error('A resolution reason is required')
    if (resolvedExceptionIds.has(eventId)) return
    resolvedExceptionIds.add(eventId)
    auditLogs.unshift({
      id: `a${auditLogs.length + 1}`,
      at: new Date().toISOString(),
      actor,
      action: 'EXCEPTION_RESOLVE',
      entity: eventId,
      detail: `${scan.result}: ${resolutionNote}`,
    })
  },
  correctRecord(recordId: string, newStatus: AttendanceRecord['status'], reason: string, userId: string) {
    const record = records.find((r) => r.id === recordId)
    if (!record) throw new Error('Record not found')
    const old = record.status
    record.status = newStatus
    record.source = 'MANUAL'
    corrections.push({
      id: `c${corrections.length + 1}`,
      recordId,
      oldStatus: old,
      newStatus,
      reason,
      byUserId: userId,
      at: new Date().toISOString(),
    })
    auditLogs.unshift({
      id: `a${auditLogs.length + 1}`,
      at: new Date().toISOString(),
      actor: userId,
      action: 'ATTENDANCE_CORRECT',
      entity: recordId,
      detail: `${old} → ${newStatus}: ${reason}`,
    })
    return record
  },
  leave() {
    return leaveRequests
  },
  setLeaveStatus(id: string, status: LeaveRequest['status']) {
    const row = leaveRequests.find((l) => l.id === id)
    if (row) row.status = status
    return row
  },
  notifications() {
    return notifications
  },
  audit() {
    return auditLogs
  },
  settings() {
    return settings
  },
  saveSettings(next: OrgSettings) {
    Object.assign(settings, next)
    return settings
  },
  courses() {
    return courses
  },
  timetable() {
    return timetable
  },
  shifts() {
    return shifts
  },
  holidays() {
    return holidays
  },
  users() {
    return demoUsers.map(({ password: _p, ...u }) => {
      void _p
      return u
    })
  },
  heatFor(personId: string) {
    return Array.from({ length: 28 }, (_, i) => {
      const seed = (personId.length + i) % 5
      const status = seed === 0 ? 'ABSENT' : seed === 1 ? 'LATE' : 'PRESENT'
      const date = new Date(now - (27 - i) * 86400_000).toISOString().slice(0, 10)
      return { date, status }
    })
  },
  ingestLiveScan() {
    const cycle = people.filter((p) => p.status === 'ACTIVE')
    const person = cycle[scans.length % cycle.length]
    const event: ScanEvent = {
      eventId: `evt-live-${crypto.randomUUID()}`,
      deviceId: 'd1',
      personId: person.id,
      rawLabel: person.personCode,
      confidence: 0.9,
      scannedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      result: 'ACCEPTED',
      direction: 'IN',
      displayName: person.name,
    }
    scans.unshift(event)
    const existing = records.find((r) => r.personId === person.id && r.date === today)
    if (existing) {
      if (!existing.derivedFromEventIds.includes(event.eventId)) {
        existing.derivedFromEventIds.push(event.eventId)
      }
    } else {
      records.unshift({
        id: `r${records.length + 1}`,
        personId: person.id,
        date: today,
        status: 'PRESENT',
        firstIn: event.scannedAt,
        source: 'DEVICE',
        derivedFromEventIds: [event.eventId],
      })
    }
    return event
  },
}
