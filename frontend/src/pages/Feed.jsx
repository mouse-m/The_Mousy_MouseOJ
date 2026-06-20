import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime, getAvatarUrl } from '../utils'

export default function Feed() {
  const { user } = useAuth()
  const limit = 25
  const [list, setList] = useState([])
  const [page, setPage] = useState(1)

  const load = () => {
    if (user) {
      api.get('/feed', { page, limit }).then(setList).catch(() => {})
    } else {
      api.get('/activities', { page, limit }).then(setList).catch(() => {})
    }
  }

  useEffect(() => { load() }, [page, user])

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1 className="page-title">动态</h1>
      {list.map(a => (
        <div key={a.id} className="card" style={{ padding: '0.75rem 1rem' }}>
          <div className="flex gap-1" style={{ alignItems: 'center' }}>
            <img src={getAvatarUrl(a.username, a.avatar)} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
            <Link to={`/users/${a.user_id}`} style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.9rem' }}>{a.username}</Link>
            <span className="text-sm" style={{ color: '#94a3b8' }}>{a.content}</span>
            <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{formatTime(a.created_at)}</span>
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="text-sm text-muted text-center" style={{ padding: '2rem' }}>暂无动态</p>}
      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={list.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
