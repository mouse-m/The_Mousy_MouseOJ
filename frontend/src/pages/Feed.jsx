import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime, getAvatarUrl, usernameColor, renderContent } from '../utils'

export default function Feed() {
  const { user } = useAuth()
  const limit = 25
  const [list, setList] = useState([])
  const [page, setPage] = useState(1)
  const [text, setText] = useState('')
  const [replyText, setReplyText] = useState({})
  const [replies, setReplies] = useState({})
  const [showReplies, setShowReplies] = useState({})

  const load = useCallback(() => {
    if (user) {
      api.get('/feed', { page, limit }).then(setList).catch(() => {})
    } else {
      api.get('/activities', { page, limit }).then(setList).catch(() => {})
    }
  }, [page, user])

  useEffect(() => { load() }, [load])

  const handlePost = async () => {
    if (!text.trim()) return
    try {
      await api.post('/activities', { content: text })
      setText('')
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除此动态？')) return
    try {
      await api.delete(`/activities/${id}`)
      load()
    } catch (e) { alert(e.message) }
  }

  const loadReplies = async (activityId) => {
    try {
      const data = await api.get(`/activities/${activityId}/replies`)
      setReplies(r => ({ ...r, [activityId]: data }))
    } catch {}
  }

  const toggleReplies = (activityId) => {
    const next = !showReplies[activityId]
    setShowReplies(s => ({ ...s, [activityId]: next }))
    if (next && !replies[activityId]) loadReplies(activityId)
  }

  const handleReply = async (activityId) => {
    const content = replyText[activityId]?.trim()
    if (!content) return
    try {
      await api.post(`/activities/${activityId}/replies`, { content })
      setReplyText(r => ({ ...r, [activityId]: '' }))
      loadReplies(activityId)
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1 className="page-title">动态</h1>

      {user && (
        <div className="card mb-2" style={{ padding: '0.75rem 1rem' }}>
          <div className="flex gap-1" style={{ alignItems: 'flex-start' }}>
            <img src={getAvatarUrl(user.username, user.avatar)} alt=""
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: '0.25rem' }} />
            <div style={{ flex: 1 }}>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="说点什么... 支持 @用户名"
                maxLength={500} rows={2}
                style={{ width: '100%', border: '1px solid #334155', borderRadius: 6, padding: '0.5rem', resize: 'none', fontFamily: 'inherit', fontSize: '0.9rem', background: '#0f172a' }} />
              <div className="flex-between mt-1">
                <span className="text-sm text-muted">{text.length}/500</span>
                <button className="btn btn-sm" onClick={handlePost} disabled={!text.trim()}>发布</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {list.length === 0 && <p className="text-sm text-muted text-center" style={{ padding: '2rem' }}>暂无动态</p>}
      {list.map(a => (
        <div key={a.id} className="card" style={{ padding: '0.75rem 1rem' }}>
          <div className="flex gap-1" style={{ alignItems: 'center' }}>
            <img src={getAvatarUrl(a.username, a.avatar)} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
            <Link to={`/users/${a.user_id}`} style={{ color: usernameColor(a.role, a.rating), fontWeight: 600, fontSize: '0.9rem' }}>{a.username}</Link>
            <span className="text-sm" style={{ color: '#94a3b8', flex: 1 }} dangerouslySetInnerHTML={{ __html: renderContent(a.content) }} />
            <span className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>{formatTime(a.created_at)}</span>
            {(user && (user.id === a.user_id || user.role === 'admin')) && (
              <button className="btn-sm btn-secondary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', color: '#f87171', borderColor: '#7f1d1d' }}
                onClick={() => handleDelete(a.id)}>删</button>
            )}
          </div>
          <div className="flex gap-1 mt-1" style={{ marginLeft: '2rem' }}>
            <button className="btn-sm btn-secondary" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
              onClick={() => toggleReplies(a.id)}>
              {showReplies[a.id] ? '收起回复' : `回复${replies[a.id]?.length ? ` (${replies[a.id].length})` : ''}`}
            </button>
          </div>
          {showReplies[a.id] && (
            <div style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
              {user && (
                <div className="flex gap-1 mb-1">
                  <input value={replyText[a.id] || ''} onChange={e => setReplyText(r => ({ ...r, [a.id]: e.target.value }))}
                    placeholder="回复..." style={{ flex: 1, fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}
                    onKeyDown={e => e.key === 'Enter' && handleReply(a.id)} />
                  <button className="btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => handleReply(a.id)} disabled={!replyText[a.id]?.trim()}>发送</button>
                </div>
              )}
              {replies[a.id]?.map(r => (
                <div key={r.id} className="flex gap-1" style={{ alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #1e293b' }}>
                  <img src={getAvatarUrl(r.username, r.avatar)} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                  <Link to={`/users/${r.user_id}`} style={{ color: usernameColor(r.role, r.rating), fontWeight: 600, fontSize: '0.8rem' }}>{r.username}</Link>
                  <span className="text-sm" style={{ color: '#cbd5e1', flex: 1 }}>{r.content}</span>
                  <span className="text-sm text-muted" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{formatTime(r.created_at)}</span>
                </div>
              )) || <span className="text-sm text-muted">加载中...</span>}
            </div>
          )}
        </div>
      ))}
      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={list.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
