import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function NewTopic() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [forums, setForums] = useState([])
  const [forumId, setForumId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/forums').then(f => { setForums(f); if (f.length) setForumId(f[0].id) }).catch(() => {})
  }, [])

  if (!user) {
    return <div className="container"><div className="card text-center"><p className="text-muted">请先登录</p></div></div>
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!forumId || !title || !content) { setError('请填写完整'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/topics', { forumId: parseInt(forumId), title, content })
      navigate(`/topics/${res.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1 className="page-title">发布 <span>新帖</span></h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>版块</label>
          <select value={forumId} onChange={e => setForumId(e.target.value)}>
            {forums.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>标题</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required />
        </div>
        <div className="form-group">
          <label>内容</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} style={{ minHeight: 200 }} required />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button type="submit" className="btn" disabled={submitting}>{submitting ? '提交中...' : '发布'}</button>
      </form>
    </div>
  )
}
