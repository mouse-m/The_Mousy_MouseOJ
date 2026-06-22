import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime } from '../utils'

export default function Bookmarks() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [page, setPage] = useState(1)
  const limit = 25

  useEffect(() => {
    if (user) api.get('/bookmarks', { page, limit }).then(setList).catch(() => {})
  }, [page, user])

  if (!user) return <div className="container"><p className="text-sm text-muted">请先登录</p></div>

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1 className="page-title">我的收藏</h1>
      {list.length === 0 ? (
        <p className="text-sm text-muted text-center" style={{ padding: '2rem' }}>暂无收藏</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {list.map((a, i) => (
            <div key={a.id} style={{
              padding: '0.75rem 1rem',
              borderBottom: i < list.length - 1 ? '1px solid #1e293b' : 'none'
            }}>
              <Link to={`/articles/${a.id}`} style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem' }}>{a.title}</Link>
              <div className="text-sm text-muted mt-1">
                <Link to={`/users/${a.user_id}`} className="text-muted">{a.author}</Link> · {a.likes}/{a.dislikes} 赞/踩 · {formatTime(a.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={list.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
