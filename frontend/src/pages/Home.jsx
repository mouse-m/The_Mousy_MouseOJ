import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime } from '../utils'

export default function Home() {
  const [data, setData] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    api.get('/home').then(setData).catch(() => {})
  }, [])

  if (!data) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container">
      <div style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: '1.8rem',
        letterSpacing: '2px', marginBottom: '2rem', paddingTop: '1rem'
      }}>
        Mouse<span style={{ color: '#38bdf8' }}>OJ</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          {data.announcements?.length > 0 && (
            <div className="card" style={{ borderLeft: '3px solid #38bdf8' }}>
              <div className="card-header"><h2>公告</h2></div>
              {data.announcements.map(a => (
                <div key={a.id} className="mb-1">
                  <Link to={`/topics/${a.id}`} className="text-sm">{a.title}</Link>
                  <div className="text-sm text-muted">{formatTime(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}

          {data.hotTopics?.length > 0 && (
            <div className="card">
              <div className="card-header"><h2>热门讨论</h2></div>
              {data.hotTopics.map(t => (
                <div key={t.id} className="flex-between mb-1">
                  <Link to={`/topics/${t.id}`} className="text-sm">{t.title}</Link>
                  <span className="text-sm text-muted">{t.author}</span>
                </div>
              ))}
            </div>
          )}

          {data.recentArticles?.length > 0 && (
            <div className="card">
              <div className="card-header"><h2>最新文章</h2></div>
              {data.recentArticles.map(a => (
                <div key={a.id} className="flex-between mb-1">
                  <Link to={`/articles/${a.id}`} className="text-sm">{a.title}</Link>
                  <span className="text-sm text-muted">{a.author}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {user && (
            <div className="card text-center" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ fontWeight: 600 }}>{user.username}</div>
              <div className="text-sm text-muted mt-2">
                <Link to={`/users/${user.id}`}>个人主页</Link>
              </div>
            </div>
          )}

          {data.upcomingContest && (
            <div className="card">
              <div className="card-header"><h2>即将开始</h2></div>
              <Link to={`/contests/${data.upcomingContest.id}`}>{data.upcomingContest.title}</Link>
              <div className="text-sm text-muted">{formatTime(data.upcomingContest.start_time)}</div>
            </div>
          )}

          {data.recentProblems?.length > 0 && (
            <div className="card">
              <div className="card-header"><h2>最新题目</h2></div>
              {data.recentProblems.map(p => (
                <div key={p.id} className="mb-1">
                  <Link to={`/problems/${p.id}`} className="text-sm">{p.title}</Link>
                </div>
              ))}
            </div>
          )}

          <div className="card text-center">
            <div style={{ fontSize: '1.5rem', color: '#38bdf8' }}>总提交</div>
            <div className="text-sm text-muted">即将上线</div>
          </div>
        </div>
      </div>
    </div>
  )
}
