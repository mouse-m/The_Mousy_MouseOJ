import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function TopicDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => api.get(`/topics/${id}`).then(setData).catch(() => {})

  useEffect(() => { load() }, [id])

  const handleReply = async () => {
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/topics/${id}/replies`, { content: replyContent })
      setReplyContent('')
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!data) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <div className="card">
        <h1 className="page-title" style={{ margin: 0 }}>{data.topic.title}</h1>
        <div className="text-sm text-muted mb-2">
          {data.topic.author} · {new Date(data.topic.created_at).toLocaleString('zh-CN')} · {data.topic.views} 次浏览
        </div>
        <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{data.topic.content}</div>
      </div>

      <h2 className="text-sm text-muted mb-1">回复 ({data.replies?.length || 0})</h2>
      {data.replies?.map(r => (
        <div key={r.id} className="card" style={{ padding: '1rem' }}>
          <div className="flex-between mb-1">
            <span className="text-sm" style={{ color: '#38bdf8', fontWeight: 600 }}>{r.author}</span>
            <span className="text-sm text-muted">{new Date(r.created_at).toLocaleString('zh-CN')}</span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{r.content}</div>
        </div>
      ))}
      {data.replies?.length === 0 && <p className="text-sm text-muted text-center" style={{ padding: '1rem' }}>暂无回复</p>}

      {user ? (
        <div className="card mt-2">
          <textarea
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder="写下你的回复..."
            style={{ minHeight: 100 }}
          />
          <button className="btn btn-sm mt-2" onClick={handleReply} disabled={submitting || !replyContent.trim()}>
            {submitting ? '提交中...' : '回复'}
          </button>
        </div>
      ) : (
        <div className="card text-center mt-2">
          <p className="text-muted">请 <Link to="/login">登录</Link> 后回复</p>
        </div>
      )}
    </div>
  )
}
