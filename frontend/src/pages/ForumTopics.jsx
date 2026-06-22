import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime, usernameColor } from '../utils'
import MarkdownPreview from '../components/MarkdownPreview'

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
        {topics.map(t => (
          <div key={t.id} style={{
            borderBottom: '1px solid #1e293b', padding: '0.75rem 1rem',
            transition: 'background 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/topics/${t.id}`} style={{
                  fontWeight: t.pinned ? 700 : 500, color: '#e2e8f0',
                  fontSize: '0.95rem', textDecoration: 'none'
                }}>
                  {t.pinned ? <span style={{ color: '#f59e0b' }}>[置顶] </span> : ''}{t.title}
                </Link>
                <div className="text-sm" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {t.online && <span className="online-dot"></span>}
                  <span style={{ color: usernameColor(t.role, t.rating) }}>
                    {t.author}
                  </span>
                  {t.tags && t.tags.split(',').filter(Boolean).map(tag => <span key={tag} className="user-tag">{tag}</span>)}
                  <span style={{ color: '#64748b' }}>·</span>
                  <span style={{ color: '#64748b' }}>{t.reply_count} 回复</span>
                  <span style={{ color: '#64748b' }}>·</span>
                  <span style={{ color: '#64748b' }}>{t.views} 浏览</span>
                  <span style={{ color: '#64748b' }}>·</span>
                  <span style={{ color: '#64748b' }}>{formatTime(t.created_at)}</span>
                </div>
              </div>
            </div>
            {t.preview_replies?.length > 0 && (
              <div style={{ marginTop: '0.5rem', borderLeft: '2px solid #334155', paddingLeft: '0.75rem' }}>
                {t.preview_replies.map((r, i) => (
                  <div key={i} style={{
                    fontSize: '0.85rem', color: '#94a3b8', marginBottom: i < t.preview_replies.length - 1 ? '0.35rem' : 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%'
                  }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>{r.author}</span>: {r.content.replace(/<[^>]*>/g, '').substring(0, 200)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {topics.length === 0 && <div className="text-center text-muted" style={{ padding: '2rem' }}>暂无帖子</div>}
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
