import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatTime } from '../utils'

export default function Home() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/home').then(setData).catch(() => {})
  }, [])

  if (!data) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: "'Press Start 2P', monospace", letterSpacing: '2px' }}>
          Mouse<span style={{ color: '#38bdf8' }}>OJ</span>
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <div className="card-header"><h2>公告</h2></div>
          {data.announcements?.length ? data.announcements.map(a => (
            <div key={a.id} style={{ marginBottom: '0.5rem' }}>
              <Link to={`/topics/${a.id}`}>{a.title}</Link>
              <div className="text-sm text-muted">{formatTime(a.created_at)}</div>
            </div>
          )) : <p className="text-sm text-muted">暂无公告</p>}
        </div>

        <div className="card">
          <div className="card-header"><h2>即将开始的比赛</h2></div>
          {data.upcomingContest ? (
            <div>
              <Link to={`/contests/${data.upcomingContest.id}`}>{data.upcomingContest.title}</Link>
              <div className="text-sm text-muted">{formatTime(data.upcomingContest.start_time)}</div>
            </div>
          ) : <p className="text-sm text-muted">暂无即将开始的比赛</p>}
        </div>

        <div className="card">
          <div className="card-header"><h2>热门讨论</h2></div>
          {data.hotTopics?.length ? data.hotTopics.map(t => (
            <div key={t.id} style={{ marginBottom: '0.5rem' }}>
              <Link to={`/topics/${t.id}`}>{t.title}</Link>
              <div className="text-sm text-muted">{t.author} · {t.views} 次浏览</div>
            </div>
          )) : <p className="text-sm text-muted">暂无热门话题</p>}
        </div>

        <div className="card">
          <div className="card-header"><h2>最新文章</h2></div>
          {data.recentArticles?.length ? data.recentArticles.map(a => (
            <div key={a.id} style={{ marginBottom: '0.5rem' }}>
              <Link to={`/articles/${a.id}`}>{a.title}</Link>
              <div className="text-sm text-muted">{a.author}</div>
            </div>
          )) : <p className="text-sm text-muted">暂无文章</p>}
        </div>

        <div className="card">
          <div className="card-header"><h2>最新题目</h2></div>
          {data.recentProblems?.length ? data.recentProblems.map(p => (
            <div key={p.id} style={{ marginBottom: '0.5rem' }}>
              <Link to={`/problems/${p.id}`}>{p.title}</Link>
            </div>
          )) : <p className="text-sm text-muted">暂无题目</p>}
        </div>
      </div>
    </div>
  )
}
