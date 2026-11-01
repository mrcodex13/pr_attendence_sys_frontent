import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, clearSession, getStoredUser, storeSession } from '../api/client'
import { hasPermission } from '../lib/permissions'
import type { Permission, User } from '../types/domain'

interface AuthState {
  user: User | null
  login: (
    email: string,
    password: string,
    organizationId?: string,
  ) => Promise<
    | { organizationSelectionRequired: true; organizations: Array<{ id: string; name: string }> }
    | { organizationSelectionRequired: false; user: User; accessToken: string; refreshToken: string }
  >
  acceptInvitation: (code: string, password: string) => Promise<void>
  logout: () => Promise<void>
  can: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  useEffect(() => {
    const onSessionExpired = () => {
      clearSession()
      setUser(null)
    }
    window.addEventListener('sas:session-expired', onSessionExpired)
    return () => window.removeEventListener('sas:session-expired', onSessionExpired)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      async login(email, password, organizationId) {
        const result = await api.login(email, password, organizationId)
        if (result.organizationSelectionRequired) return result
        storeSession(result.user, result.accessToken, result.refreshToken)
        setUser(result.user)
        return result
      },
      async acceptInvitation(code, password) {
        const result = await api.acceptInvitation(code, password)
        storeSession(result.user, result.accessToken, result.refreshToken)
        setUser(result.user)
      },
      async logout() {
        const request = api.logout().catch(() => undefined)
        clearSession()
        setUser(null)
        await request
      },
      can(permission) {
        return hasPermission(user?.role, permission)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// This hook shares its context with the provider in the same module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
