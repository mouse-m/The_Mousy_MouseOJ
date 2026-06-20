import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import './Layout.css'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [locked, setLocked] = useState(() => !!localStorage.getItem('locked'))
  const [unlockPwd, setUnlockPwd] = useState('')
  const [unlockErr, setUnlockErr] = useState('')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleLock = () => {
    localStorage.setItem('locked', '1')
    setLocked(true)
  }

  const handleUnlock = async () => {
    try {
      await api.post('/auth/verify-password', { password: unlockPwd })
      localStorage.removeItem('locked')
      setLocked(false)
      setUnlockPwd('')
      setUnlockErr('')
    } catch (e) {
      setUnlockErr('密码错误')
    }
  }

  return (
    <div className="layout">
      {locked && (
        <div style={{
          position: 'fixed', inset: 0, background: '#0f172a', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem'
        }}>
          <div style={{ fontSize: '2rem', fontFamily: "'Press Start 2P', monospace", letterSpacing: '2px' }}>
            Mouse<span style={{ color: '#38bdf8' }}>OJ</span>
          </div>
          <div className="text-sm text-muted">已锁定</div>
          <input type="password" value={unlockPwd} onChange={e => setUnlockPwd(e.target.value)}
            placeholder="输入密码解锁" autoFocus
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', width: 240, textAlign: 'center' }} />
          {unlockErr && <span className="text-sm" style={{ color: '#f87171' }}>{unlockErr}</span>}
          <button className="btn btn-sm" onClick={handleUnlock}>解锁</button>
        </div>
      )}

      <nav className="navbar">
        <div className="nav-inner">
          <Link to="/" className="nav-brand">Mouse<span>OJ</span></Link>
          <div className="nav-links">
            <Link to="/problems">题库</Link>
            <Link to="/forums">讨论区</Link>
            <Link to="/articles">文章</Link>
            <Link to="/contests">比赛</Link>
            <Link to="/feed">动态</Link>
            <Link to="/leaderboard">排行榜</Link>
            <Link to="/submissions">提交</Link>
            <Link to="/tickets">工单</Link>
            {user && (user.role === 'admin' || user.id === 1) && <Link to="/announcements">公告</Link>}
          </div>
          <div className="nav-sep"></div>
          <div className="nav-right">
            {user ? (
              <div className="nav-user">
                <Link to={`/users/${user.id}`} className="nav-username">{user.username}</Link>
                <button className="btn btn-sm btn-secondary" onClick={handleLock}>锁定</button>
                <button className="btn btn-sm btn-secondary" onClick={handleLogout}>退出</button>
              </div>
            ) : (
              <div className="nav-user">
                <Link to="/login" className="btn btn-sm">登录</Link>
                <Link to="/register" className="btn btn-sm btn-secondary">注册</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="main">{children}</main>
      <footer style={{
        textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem', color: '#475569',
        borderTop: '1px solid #1e293b', marginTop: '2rem'
      }}>
        <a href="https://github.com/mouse-m/The_Mousy_MouseOJ" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b' }}>GitHub</a>
        <span style={{ margin: '0 0.5rem' }}>·</span>
        <a href="mailto:mousy@mouseoj.cc.cd" style={{ color: '#64748b' }}>申诉</a>
        <span style={{ margin: '0 0.5rem' }}>·</span>
        Made by minermouse
      </footer>
    </div>
  )
}
