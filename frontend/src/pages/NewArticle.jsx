import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function NewArticle() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return <div className="container"><div className="card text-center"><p className="text-muted">请先登录</p></div></div>
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !content) { setError('请填写完整'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/articles', { title, content })
      navigate(`/articles/${res.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1 className="page-title">发布 <span>文章</span></h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>标题</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>内容</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} style={{ minHeight: 300 }} required />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button type="submit" className="btn" disabled={submitting}>{submitting ? '提交中...' : '发布'}</button>
      </form>
    </div>
  )
}
