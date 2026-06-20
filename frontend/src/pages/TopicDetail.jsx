import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import MarkdownPreview from '../components/MarkdownPreview'
import MarkdownEditor from '../components/MarkdownEditor'
import { formatTime } from '../utils'

export default function TopicDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

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

  const handleEdit = async () => {
    try {
      await api.patch(`/topics/${id}`, { content: editContent })
      setEditing(false)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定删除此帖子？')) return
    try {
      await api.delete(`/topics/${id}`)
      navigate('/forums')
    } catch (err) {
      alert(err.message)
    }
  }

  if (!data) return <div className="container"><div className="loading">加载中...</div></div>

  const isAuthor = user && (user.id === data.topic.user_id || user.role === 'admin')

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <div className="card">
        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{data.topic.title}</h1>
            <div className="text-sm text-muted mb-2">
              {data.topic.author}{data.topic.tags && data.topic.tags.split(',').filter(Boolean).map(t => <span key={t} className="user-tag">{t}</span>)} · {formatTime(data.topic.created_at)} · {data.topic.views} 次浏览
            </div>
          </div>
          {isAuthor && !editing && (
            <div className="flex gap-1">
              <button className="btn btn-sm btn-secondary" onClick={() => { setEditContent(data.topic.content); setEditing(true) }}>编辑</button>
              <button className="btn btn-sm btn-secondary" onClick={handleDelete} style={{ color: '#f87171' }}>删除</button>
            </div>
          )}
        </div>
        {editing ? (
          <div>
            <MarkdownEditor value={editContent} onChange={setEditContent} minHeight={200} />
            <div className="flex gap-1 mt-2">
              <button className="btn btn-sm" onClick={handleEdit}>保存</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setEditing(false)}>取消</button>
            </div>
          </div>
        ) : (
          <MarkdownPreview content={data.topic.content} />
        )}
      </div>

      <h2 className="text-sm text-muted mb-1">回复 ({data.replies?.length || 0})</h2>
      {data.replies?.map(r => (
        <div key={r.id} className="card" style={{ padding: '1rem' }}>
          <div className="flex-between mb-1">
            <span className="text-sm" style={{ color: '#38bdf8', fontWeight: 600 }}>{r.author}{r.tags && r.tags.split(',').filter(Boolean).map(t => <span key={t} className="user-tag">{t}</span>)}</span>
            <span className="text-sm text-muted">{formatTime(r.created_at)}</span>
          </div>
          <MarkdownPreview content={r.content} />
        </div>
      ))}
      {data.replies?.length === 0 && <p className="text-sm text-muted text-center" style={{ padding: '1rem' }}>暂无回复</p>}

      {user ? (
        <div className="card mt-2">
          <MarkdownEditor
            value={replyContent}
            onChange={setReplyContent}
            minHeight={100}
            placeholder="写下你的回复..."
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
