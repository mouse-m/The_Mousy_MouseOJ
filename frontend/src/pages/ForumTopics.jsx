import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime } from '../utils'

export default function ForumTopics() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [topics, setTopics] = useState([])
  const [page, setPage] = useState(1)
  const limit = 25

  useEffect(() => {
    api.get(`/forums/${slug}/topics`, { page, limit }).then(setTopics).catch(() => {})
  }, [slug, page])

  return (
    <div className="container">
      <Link to="/forums" className="text-sm text-muted">← 返回版块列表</Link>
      <h1 className="page-title mt-2">讨论区 <span>/{slug}</span></h1>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>标题</th><th>作者</th><th>回复</th><th>浏览</th><th>时间</th></tr>
          </thead>
          <tbody>
            {topics.map(t => (
              <tr key={t.id}>
                <td>
                  <Link to={`/topics/${t.id}`} style={{ fontWeight: t.pinned ? 700 : 400 }}>
                    {t.pinned ? '[置顶] ' : ''}{t.title}
                  </Link>
                </td>
                <td className="text-sm text-muted">{t.author}{t.tags && t.tags.split(',').filter(Boolean).map(tag => <span key={tag} className="user-tag">{tag}</span>)}</td>
                <td className="text-sm text-muted">{t.reply_count}</td>
                <td className="text-sm text-muted">{t.views}</td>
                <td className="text-sm text-muted">{formatTime(t.created_at)}</td>
              </tr>
            ))}
            {topics.length === 0 && <tr><td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>暂无帖子</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex-between mt-2">
        <div className="pagination" style={{ margin: 0 }}>
          <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
          <button className="btn btn-sm btn-secondary" disabled={topics.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
        {user && <Link to="/topics/new" className="btn btn-sm">发帖</Link>}
      </div>
    </div>
  )
}
