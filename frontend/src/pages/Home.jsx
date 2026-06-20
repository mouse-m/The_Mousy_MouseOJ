import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime, getAvatarUrl } from '../utils'

export default function Home() {
  const [data, setData] = useState(null)
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.id === 1

  useEffect(() => {
    api.get('/home').then(setData).catch(() => {})
  }, [])

  if (!data) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: "'Press Start 2P', monospace", letterSpacing: '2px', margin: 0 }}>
          Mouse<span style={{ color: '#38bdf8' }}>OJ</span>
        </h1>
        {isAdmin && <Link to="/announcements" className="btn btn-sm btn-secondary">管理公告</Link>}
      </div>

      {data.announcements?.length > 0 && (
        <div className="card mb-2">
          <div className="card-header"><h2>公告</h2></div>
          {data.announcements.map(a => (
            <Link key={a.id} to={`/announcements/${a.id}`} className="flex-between" style={{
              padding: '0.75rem 0', borderBottom: '1px solid #1e293b', textDecoration: 'none',
              transition: 'background 0.15s', display: 'block'
            }}>
              <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{a.title}</div>
              <div className="text-sm text-muted">{formatTime(a.created_at)}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="card mb-2">
        <div className="card-header"><h2>即将开始的比赛</h2></div>
        {data.upcomingContest ? (
          <div>
            <Link to={`/contests/${data.upcomingContest.id}`}>{data.upcomingContest.title}</Link>
            <div className="text-sm text-muted">{formatTime(data.upcomingContest.start_time)}</div>
          </div>
        ) : <p className="text-sm text-muted">暂无即将开始的比赛</p>}
      </div>

      <div className="card mb-2">
        <div className="card-header"><h2>热门讨论</h2></div>
        {data.hotTopics?.length ? data.hotTopics.map(t => (
          <div key={t.id} style={{ marginBottom: '0.5rem' }}>
            <Link to={`/topics/${t.id}`}>{t.title}</Link>
            <div className="text-sm text-muted"><Link to={`/users/${t.user_id}`} className="text-muted">{t.author}</Link> · {t.views} 次浏览</div>
          </div>
        )) : <p className="text-sm text-muted">暂无热门话题</p>}
      </div>

      <div className="card mb-2">
        <div className="card-header"><h2>最新文章</h2></div>
        {data.recentArticles?.length ? data.recentArticles.map(a => (
          <div key={a.id} style={{ marginBottom: '0.5rem' }}>
            <Link to={`/articles/${a.id}`}>{a.title}</Link>
            <div className="text-sm text-muted"><Link to={`/users/${a.user_id}`} className="text-muted">{a.author}</Link></div>
          </div>
        )) : <p className="text-sm text-muted">暂无文章</p>}
      </div>

      <div className="card mb-2">
        <div className="card-header"><h2>最新题目</h2></div>
        {data.recentProblems?.length ? data.recentProblems.map(p => (
          <div key={p.id} style={{ marginBottom: '0.5rem' }}>
            <Link to={`/problems/${p.id}`}>{p.title}</Link>
          </div>
        )) : <p className="text-sm text-muted">暂无题目</p>}
      </div>

      {data.feed?.length > 0 && (
        <div className="card mt-2">
          <div className="card-header"><h2>{user ? '关注动态' : '最新动态'}</h2></div>
          {data.feed.map(a => (
            <div key={a.id} className="flex-between mb-1 text-sm">
              <div className="flex gap-1" style={{ alignItems: 'center' }}>
                <img src={getAvatarUrl(a.username, a.avatar)} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                <Link to={`/users/${a.user_id}`} style={{ color: '#38bdf8', fontWeight: 600 }}>{a.username}</Link>
                {' '}{a.content}
              </div>
              <span className="text-muted">{formatTime(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
