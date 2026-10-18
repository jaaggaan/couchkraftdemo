import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type AuthUser } from '../lib/auth-api'

export type AuthView = 'signin' | 'signup' | 'forgot' | 'verify'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  modalOpen: boolean
  view: AuthView
  openAuth: (view?: AuthView) => void
  closeAuth: () => void
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<AuthView>('signin')

  const refresh = async () => {
    const result = await authApi.me()
    setUser(result.user ?? null)
  }

  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      modalOpen,
      view,
      openAuth: (next = 'signin') => {
        setView(next)
        setModalOpen(true)
      },
      closeAuth: () => setModalOpen(false),
      refresh,
      signOut: async () => {
        await authApi.logout()
        setUser(null)
      },
    }),
    [user, loading, modalOpen, view],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
