import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (username.length < 3) { setError('用户名至少 3 个字符'); return }
    if (password.length < 6) { setError('密码至少 6 位'); return }
    setLoading(true)
    try {
      await register(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 400, margin: '4rem auto' }}>
      <h1 className="page-title text-center">注册 <span>MouseOJ</span></h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>用户名 (3-20 字符)</label>
          <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={20} />
        </div>
        <div className="form-group">
          <label>密码 (至少 6 位)</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button type="submit" className="btn w-full" disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>
        <div className="text-center text-sm text-muted mt-2">
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </form>
    </div>
  )
}
