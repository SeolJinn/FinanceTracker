import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react'
import { authService } from '@/services/authService'

interface User {
  email: string
  firstName: string
  lastName: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isTokenValid()) {
        const savedUser = authService.getUser()
        if (savedUser) {
          setUser(savedUser)
        }
      } else {
        // Clear expired token data
        authService.logout()
      }
      setLoading(false)
    }
    
    initAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password })
    setUser({
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName
    })
  }, [])

  const register = useCallback(async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    const response = await authService.register(userData)
    setUser({
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName
    })
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    loading
  }), [user, loading, login, register, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}