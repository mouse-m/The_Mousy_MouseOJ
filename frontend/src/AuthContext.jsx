import { createContext, useContext, useState, useEffect } from 'react'
import { setToken, setStoredUser, getStoredUser } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser())

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  const login = async (login, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '登录失败')
    setToken(data.token)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }

  const register = async (username, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '注册失败')
    setToken(data.token)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }

  const registerEmail = async (email, username, password) => {
    const res = await fetch('/api/auth/register-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '注册失败')
    return data
  }

  const verifyEmail = async (email, code) => {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '验证失败')
    setToken(data.token)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }

  const resendCode = async (email) => {
    const res = await fetch('/api/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '发送失败')
    return data
  }

  const logout = () => {
    setToken(null)
    setStoredUser(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, registerEmail, verifyEmail, resendCode, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
