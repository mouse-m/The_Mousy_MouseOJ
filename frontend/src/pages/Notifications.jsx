import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { formatTime } from '../utils'

export default function Notifications() {
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/notifications', { limit: 50, offset: 0 })
      setNotifs(data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markAllRead = async () => {
    try { await api.post('/notifications/read-all'); setNotifs(n => n.map(x => ({ ...x, is_read: 1 }))) } catch {}
  }

  const handleClick = async (n) => {
    if (!n.is_read) {
      try { await api.post(`/notifications/${n.id}/read`); setNotifs(prev => prev.map(p => p.id === n.id ? { ...p, is_read: 1 } : p)) } catch {}
    }
    if (n.type === 'reply' || n.type === 'mention') navigate(`/topics/${n.ref_id}`)
    else if (n.type === 'ticket') navigate(`/tickets/${n.ref_id}`)
    else if (n.type === 'message') navigate('/messages')
    else if (n.type === 'follow') navigate(`/users/${n.ref_id || ''}`)
  }

  const typeIcon = (type) => {
    switch (type) {
      case 'reply': return '💬'
      case 'mention': return '@'
      case 'ticket': return '🎫'
      case 'message': return '✉️'
      case 'follow': return '👤'
      default: return '🔔'
    }
  }

  if (loading) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ margin: 0 }}>通知</h1>
        {notifs.some(n => !n.is_read) && (
          <button className="btn btn-sm" onClick={markAllRead}>全部标记已读</button>
        )}
      </div>
      {notifs.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <p className="text-muted">暂无通知</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {notifs.map((n, i) => (
            <div key={n.id} onClick={() => handleClick(n)}
              style={{
                padding: '0.75rem 1rem', cursor: 'pointer',
                borderBottom: i < notifs.length - 1 ? '1px solid #1e293b' : 'none',
                background: n.is_read ? 'transparent' : 'rgba(56, 189, 248, 0.05)',
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(56, 189, 248, 0.05)'}
            >
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{typeIcon(n.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e2e8f0', fontWeight: n.is_read ? 400 : 600, fontSize: '0.9rem' }}>{n.title}</div>
                {n.content && <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.2rem' }}>{n.content}</div>}
                <div style={{ color: '#475569', fontSize: '0.7rem', marginTop: '0.25rem' }}>{formatTime(n.created_at)}</div>
              </div>
              {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', flexShrink: 0, marginTop: '0.4rem' }}></span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
