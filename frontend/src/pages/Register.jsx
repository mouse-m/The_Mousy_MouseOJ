import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Register() {
  const [mode, setMode] = useState('simple') // simple | email
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('form') // form | verify | done
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, registerEmail, verifyEmail, resendCode } = useAuth()
  const navigate = useNavigate()

  const handleSimpleRegister = async (e) => {
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

  const handleEmailRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (username.length < 3) { setError('用户名至少 3 个字符'); return }
    if (password.length < 6) { setError('密码至少 6 位'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('邮箱格式不正确'); return }
    setLoading(true)
    try {
      await registerEmail(email, username, password)
      setStep('verify')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    if (code.length !== 6) { setError('请输入6位验证码'); return }
    setLoading(true)
    try {
      await verifyEmail(email, code)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    try {
      await resendCode(email)
      setError('验证码已重新发送')
    } catch (err) {
      setError(err.message)
    }
  }

  if (step === 'verify') {
    return (
      <div className="container" style={{ maxWidth: 400, margin: '4rem auto' }}>
        <h1 className="page-title text-center">验证邮箱</h1>
        <div className="card">
          <p className="text-sm text-muted text-center mb-2">
            验证码已发送至 <strong style={{ color: '#e2e8f0' }}>{email}</strong>
          </p>
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>6 位验证码</label>
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" required maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5rem' }} />
            </div>
            {error && <div className="text-sm" style={{ color: error === '验证码已重新发送' ? '#4ade80' : '#f87171', marginBottom: '0.5rem' }}>{error}</div>}
            <button type="submit" className="btn w-full" disabled={loading || code.length !== 6}>
              {loading ? '验证中...' : '验证'}
            </button>
          </form>
          <div className="text-center text-sm text-muted mt-2">
            <button className="btn-link" onClick={handleResend} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.85rem' }}>
              重新发送验证码
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 400, margin: '4rem auto' }}>
      <h1 className="page-title text-center">注册 <span>MouseOJ</span></h1>

      <div className="flex-center" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => { setMode('simple'); setError('') }}
          style={{
            padding: '0.4rem 1rem', border: 'none', borderRadius: 6, cursor: 'pointer',
            background: mode === 'simple' ? '#38bdf8' : '#1e293b',
            color: mode === 'simple' ? '#0f172a' : '#94a3b8', fontWeight: 600, fontSize: '0.85rem'
          }}>快速注册</button>
        <button onClick={() => { setMode('email'); setError('') }}
          style={{
            padding: '0.4rem 1rem', border: 'none', borderRadius: 6, cursor: 'pointer',
            background: mode === 'email' ? '#38bdf8' : '#1e293b',
            color: mode === 'email' ? '#0f172a' : '#94a3b8', fontWeight: 600, fontSize: '0.85rem'
          }}>邮箱注册</button>
      </div>

      {mode === 'simple' ? (
        <form onSubmit={handleSimpleRegister} className="card">
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
      ) : (
        <form onSubmit={handleEmailRegister} className="card">
          <div className="form-group">
            <label>邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" />
          </div>
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
            {loading ? '发送验证码...' : '发送验证码'}
          </button>
          <div className="text-center text-sm text-muted mt-2">
            已有账号？<Link to="/login">去登录</Link>
          </div>
        </form>
      )}
    </div>
  )
}
