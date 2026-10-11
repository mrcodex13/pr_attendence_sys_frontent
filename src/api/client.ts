import { mockApi } from './mock/store'
import type { AttendanceRecord, OrgSettings, Person, User } from '../types/domain'

const TOKEN_KEY = 'sas.access'
const REFRESH_KEY = 'sas.refresh'
const USER_KEY = 'sas.user'

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

async function tryBackendLogin(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Backend login failed')
  return res.json() as Promise<{ data?: { user: User; accessToken: string; refreshToken: string } } & { user?: User; tokens?: { accessToken: string; refreshToken: string } }>
}

export const api = {
  async login(email: string, password: string) {
    try {
      const body = await tryBackendLogin(email, password)
      const user = body.data?.user ?? body.user
      const access = body.data?.accessToken ?? body.tokens?.accessToken
      const refresh = body.data?.refreshToken ?? body.tokens?.refreshToken
      if (user && access && refresh) return { user, accessToken: access, refreshToken: refresh }
    } catch {
      /* fall through to mock — backend schema is still school-only */
    }
    return mockApi.login(email, password)
  },
  logout() {
    clearSession()
  },
  dashboard(scope?: string[]) {
    return mockApi.stats(scope)
  },
  people() {
    return mockApi.people()
  },
  person(id: string) {
    return mockApi.person(id)
  },
  addPerson(input: Omit<Person, 'id'>) {
    return mockApi.addPerson(input)
  },
  groups() {
    return mockApi.groups()
  },
  devices() {
    return mockApi.devices()
  },
  device(id: string) {
    return mockApi.device(id)
  },
  registerDevice(input: Parameters<typeof mockApi.registerDevice>[0]) {
    return mockApi.registerDevice(input)
  },
  simulateAuthenticatedHeartbeat(deviceId: string, actor: string) {
    return mockApi.simulateAuthenticatedHeartbeat(deviceId, actor)
  },
  enrollments() {
    return mockApi.enrollments()
  },
  startEnrollment(personId: string, deviceId: string) {
    return mockApi.startEnrollment(personId, deviceId)
  },
  completeEnrollment(id: string, success: boolean) {
    return mockApi.completeEnrollment(id, success)
  },
  scans() {
    return mockApi.scans()
  },
  records() {
    return mockApi.records()
  },
  exceptions() {
    return mockApi.exceptions()
  },
  resolveException(eventId: string, note: string, actor: string) {
    return mockApi.resolveException(eventId, note, actor)
  },
  correctRecord(recordId: string, status: AttendanceRecord['status'], reason: string, userId: string) {
    return mockApi.correctRecord(recordId, status, reason, userId)
  },
  leave() {
    return mockApi.leave()
  },
  setLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') {
    return mockApi.setLeaveStatus(id, status)
  },
  notifications() {
    return mockApi.notifications()
  },
  audit() {
    return mockApi.audit()
  },
  settings() {
    return mockApi.settings()
  },
  saveSettings(next: OrgSettings) {
    return mockApi.saveSettings(next)
  },
  courses() {
    return mockApi.courses()
  },
  timetable() {
    return mockApi.timetable()
  },
  shifts() {
    return mockApi.shifts()
  },
  holidays() {
    return mockApi.holidays()
  },
  users() {
    return mockApi.users()
  },
  heatFor(personId: string) {
    return mockApi.heatFor(personId)
  },
  ingestLiveScan() {
    return mockApi.ingestLiveScan()
  },
}
