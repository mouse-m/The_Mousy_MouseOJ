import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import { formatTime } from '../utils'
import './Layout.css'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [locked, setLocked] = useState(() => !!localStorage.getItem('locked'))
  const [unlockPwd, setUnlockPwd] = useState('')
  const [unlockErr, setUnlockErr] = useState('')
  const [notifCount, setNotifCount] = useState(0)
  const [notifs, setNotifs] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  const loadNotifCount = useCallback(async () => {
    if (!user) return
    try {
      const data = await api.get('/notifications/unread/count')
      setNotifCount(data.count)
    } catch {}
  }, [user])

  const loadNotifs = useCallback(async () => {
    if (!user) return
    try {
      const data = await api.get('/notifications', { limit: 5, offset: 0 })
      setNotifs(data)
    } catch {}
  }, [user])

  useEffect(() => { loadNotifCount(); const id = setInterval(loadNotifCount, 60000); return () => clearInterval(id) }, [loadNotifCount])

  useEffect(() => {
    if (showNotifs) loadNotifs()
  }, [showNotifs, loadNotifs])

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      try { await api.post(`/notifications/${n.id}/read`) } catch {}
      setNotifCount(c => Math.max(0, c - 1))
    }
    setShowNotifs(false)
    if (n.type === 'reply' || n.type === 'mention') navigate(`/topics/${n.ref_id}`)
    else if (n.type === 'ticket') navigate(`/tickets/${n.ref_id}`)
    else if (n.type === 'message') navigate('/messages')
    else if (n.type === 'follow') navigate(`/users/${n.ref_id || (notifs.find(x => x.id === n.id)?.ref_id) || ''}`)
  }

  const handleMarkAllRead = async () => {
    try { await api.post('/notifications/read-all'); setNotifCount(0); setNotifs(n => n.map(x => ({ ...x, is_read: 1 }))) } catch {}
  }

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
                <div ref={notifRef} style={{ position: 'relative', display: 'inline-block' }}>
                  <button onClick={() => setShowNotifs(s => !s)}
                    style={{
                      background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                      fontSize: '1.2rem', position: 'relative', padding: '0.2rem 0.4rem'
                    }}
                    title="通知">
                    🔔
                    {notifCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -2, right: -2, background: '#ef4444',
                        color: '#fff', fontSize: '0.6rem', borderRadius: '50%',
                        minWidth: 16, height: 16, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700, padding: '0 3px'
                      }}>{notifCount > 99 ? '99+' : notifCount}</span>
                    )}
                  </button>
                  {showNotifs && (
                    <div style={{
                      position: 'absolute', right: 0, top: '100%', zIndex: 100,
                      background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                      minWidth: 320, maxHeight: 400, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      marginTop: 4
                    }}>
                      <div className="flex-between" style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #334155' }}>
                        <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>通知</span>
                        <div className="flex gap-1">
                          {notifCount > 0 && <button className="btn-sm" onClick={handleMarkAllRead} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>全部已读</button>}
                          <Link to="/notifications" className="btn-sm btn-secondary" onClick={() => setShowNotifs(false)}
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', textDecoration: 'none' }}>查看全部</Link>
                        </div>
                      </div>
                      {notifs.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>暂无通知</div>
                      ) : (
                        notifs.map(n => (
                          <div key={n.id} onClick={() => handleNotifClick(n)}
                            style={{
                              padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem',
                              background: n.is_read ? 'transparent' : 'rgba(56, 189, 248, 0.05)',
                              borderBottom: '1px solid #1e293b'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                            onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(56, 189, 248, 0.05)'}
                          >
                            <div style={{ color: '#e2e8f0', fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</div>
                            <div style={{ color: '#475569', fontSize: '0.65rem', marginTop: '0.1rem' }}>{formatTime(n.created_at)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
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
