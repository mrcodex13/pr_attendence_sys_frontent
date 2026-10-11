import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { api, clearSession, getStoredUser, storeSession } from '../api/client'
import { hasPermission } from '../lib/permissions'
import type { Permission, User } from '../types/domain'

interface AuthState {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  can: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  const value = useMemo<AuthState>(
    () => ({
      user,
      async login(email, password) {
        const result = await api.login(email, password)
        storeSession(result.user, result.accessToken, result.refreshToken)
        setUser(result.user)
      },
      logout() {
        clearSession()
        setUser(null)
      },
      can(permission) {
        return hasPermission(user?.role, permission)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
