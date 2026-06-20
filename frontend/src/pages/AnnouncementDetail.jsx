import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { formatTime } from '../utils'
import MarkdownPreview from '../components/MarkdownPreview'

export default function AnnouncementDetail() {
  const { id } = useParams()
  const [a, setA] = useState(null)

  useEffect(() => {
    api.get(`/announcements/${id}`).then(setA).catch(() => {})
  }, [id])

  if (!a) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <div className="mb-2">
        <Link to="/announcements" className="text-sm text-muted">&larr; 返回公告列表</Link>
      </div>
      <div className="card">
        <h1 className="page-title" style={{ margin: 0, marginBottom: '0.5rem' }}>{a.title}</h1>
        <div className="text-sm text-muted mb-2">{formatTime(a.created_at)}</div>
        <MarkdownPreview content={a.content} />
      </div>
    </div>
  )
}
