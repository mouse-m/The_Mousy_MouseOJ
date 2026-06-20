import { useState, useEffect } from 'react'
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

  const load = () => {
    if (user) {
      api.get('/feed', { page, limit }).then(setList).catch(() => {})
    } else {
      api.get('/activities', { page, limit }).then(setList).catch(() => {})
    }
  }

  useEffect(() => { load() }, [page, user])

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
            <Link to={`/users/${a.user_id}`} style={{ color: usernameColor(a.role), fontWeight: 600, fontSize: '0.9rem' }}>{a.username}</Link>
            <span className="text-sm" style={{ color: '#94a3b8', flex: 1 }} dangerouslySetInnerHTML={{ __html: renderContent(a.content) }} />
            <span className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>{formatTime(a.created_at)}</span>
          </div>
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
