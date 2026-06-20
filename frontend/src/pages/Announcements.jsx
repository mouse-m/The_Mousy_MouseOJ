import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import MarkdownEditor from '../components/MarkdownEditor'
import { formatTime } from '../utils'

export default function Announcements() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.id === 1
  const limit = 25
  const [list, setList] = useState([])
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editId, setEditId] = useState(null)

  const load = () => api.get('/announcements', { page, limit }).then(setList).catch(() => {})

  useEffect(() => { load() }, [page])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !content) return
    try {
      if (editId) {
        await api.patch(`/announcements/${editId}`, { title, content })
      } else {
        await api.post('/announcements', { title, content })
      }
      setShowForm(false)
      setTitle('')
      setContent('')
      setEditId(null)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEdit = (a) => {
    setTitle(a.title)
    setContent(a.content)
    setEditId(a.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除此公告？')) return
    try {
      await api.delete(`/announcements/${id}`)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ margin: 0 }}>公告 <span>管理</span></h1>
        {isAdmin && (
          <button className="btn btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setTitle(''); setContent('') }}>
            {showForm ? '取消' : '发布公告'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="card mb-2">
          <div className="form-group">
            <label>标题</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>内容</label>
            <MarkdownEditor value={content} onChange={setContent} minHeight={150} />
          </div>
          <button type="submit" className="btn btn-sm">{editId ? '保存' : '发布'}</button>
        </form>
      )}

      {list.map(a => (
        <div key={a.id} className="card">
          <div className="flex-between mb-1">
            <Link to={`/announcements/${a.id}`} className="flex-between" style={{
              flex: 1, textDecoration: 'none', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{a.title}</span>
              <span className="text-sm text-muted" style={{ marginLeft: '0.5rem' }}>{formatTime(a.created_at)}</span>
            </Link>
            {isAdmin && (
              <div className="flex gap-1" style={{ marginLeft: '0.5rem', flexShrink: 0 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(a)}>编辑</button>
                <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(a.id)} style={{ color: '#f87171' }}>删除</button>
              </div>
            )}
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="text-sm text-muted text-center" style={{ padding: '2rem' }}>暂无公告</p>}

      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={list.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
