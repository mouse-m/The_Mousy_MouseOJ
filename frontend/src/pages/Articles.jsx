import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime } from '../utils'

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [page, setPage] = useState(1)
  const { user } = useAuth()
  const limit = 25

  useEffect(() => {
    api.get('/articles', { page, limit }).then(setArticles).catch(() => {})
  }, [page])

  return (
    <div className="container">
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ margin: 0 }}>文章 <span>社区</span></h1>
        {user && <Link to="/articles/new" className="btn btn-sm">写文章</Link>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>标题</th><th>作者</th><th>点赞</th><th>时间</th></tr>
          </thead>
          <tbody>
            {articles.map(a => (
              <tr key={a.id}>
                <td><Link to={`/articles/${a.id}`}>{a.title}</Link></td>
                <td className="text-sm text-muted"><Link to={`/users/${a.user_id}`} className="text-muted">{a.author}</Link></td>
                <td className="text-sm text-muted">{a.likes}</td>
                <td className="text-sm text-muted">{formatTime(a.created_at)}</td>
              </tr>
            ))}
            {articles.length === 0 && <tr><td colSpan={4} className="text-center text-muted" style={{ padding: '2rem' }}>暂无文章</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={articles.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
