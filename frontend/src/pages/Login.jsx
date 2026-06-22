import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login: doLogin } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await doLogin(login, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isEmail = login.includes('@')

  return (
    <div className="container" style={{ maxWidth: 400, margin: '4rem auto' }}>
      <h1 className="page-title text-center">登录 <span>MouseOJ</span></h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>用户名 / 邮箱</label>
          <input value={login} onChange={e => setLogin(e.target.value)} required placeholder="用户名 或 邮箱" />
        </div>
        <div className="form-group">
          <label>密码</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button type="submit" className="btn w-full" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
        <div className="text-center text-sm text-muted mt-2">
          还没有账号？<Link to="/register">立即注册</Link>
        </div>
      </form>
    </div>
  )
}
