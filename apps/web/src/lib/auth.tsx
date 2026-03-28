'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type LoginMethod = 'email' | 'sms' | 'wallet' | 'google'

interface DemoUser {
  email?: { address?: string }
  linkedAccounts: Array<{ type: string; address?: string }>
}

interface AuthContextValue {
  ready: boolean
  authenticated: boolean
  user: DemoUser | null
  login: (options?: { loginMethods?: LoginMethod[] }) => Promise<void>
  logout: () => Promise<void>
}

const AUTH_STORAGE_KEY = 'anara-demo-auth'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<DemoUser | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (raw) {
        setUser(JSON.parse(raw) as DemoUser)
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    } finally {
      setReady(true)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    authenticated: Boolean(user),
    user,
    login: async (options) => {
      const primaryMethod = options?.loginMethods?.[0] ?? 'email'
      const nextUser: DemoUser = {
        email: primaryMethod === 'wallet' ? undefined : { address: 'demo@anara.io' },
        linkedAccounts: [
          {
            type: 'wallet',
            address: '0x1111111111111111111111111111111111111111',
          },
        ],
      }
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
    },
    logout: async () => {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      setUser(null)
    },
  }), [ready, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
