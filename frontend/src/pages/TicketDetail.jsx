import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import MarkdownPreview from '../components/MarkdownPreview'
import MarkdownEditor from '../components/MarkdownEditor'
import { formatTime } from '../utils'

export default function TicketDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const isAdmin = user?.role === 'admin' || user?.id === 1
  const [reply, setReply] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const load = () => api.get(`/tickets/${id}`).then(setTicket).catch(() => {})

  useEffect(() => { load() }, [id])

  const handleUpdate = async () => {
    if (!reply.trim()) return
    try {
      await api.patch(`/tickets/${id}`, { reply })
      setReply('')
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEditSave = async () => {
    try {
      await api.patch(`/tickets/${id}`, { title: editTitle, content: editContent })
      setEditing(false)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定删除此工单？')) return
    try {
      await api.delete(`/tickets/${id}`)
      navigate('/tickets')
    } catch (err) {
      alert(err.message)
    }
  }

  if (!ticket) return <div className="container"><div className="loading">加载中...</div></div>

  const isOwner = user && (user.id === ticket.user_id || isAdmin)

  let badgeClass = 'badge-pending'
  if (ticket.status === 'resolved' || ticket.status === 'closed') badgeClass = 'badge-ok'
  else if (ticket.status === 'processing') badgeClass = 'badge-manual'
  else if (ticket.status === 'pending') badgeClass = 'badge-tle'

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <Link to="/tickets" className="text-sm text-muted">← 返回工单列表</Link>
      <h1 className="page-title mt-2">工单 <span>#{ticket.id}</span></h1>

      <div className="card">
        <div className="flex-between mb-2">
          <div>
            <span className="text-sm text-muted">{ticket.category || '未分类'}</span>
            <span className={`badge ${badgeClass}`} style={{ marginLeft: '0.5rem' }}>{ticket.status}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-sm text-muted">{ticket.username} · {formatTime(ticket.created_at)}</span>
            {isOwner && !editing && (
              <>
                <button className="btn btn-sm btn-secondary" onClick={() => { setEditTitle(ticket.title); setEditContent(ticket.content); setEditing(true) }}>编辑</button>
                <button className="btn btn-sm btn-secondary" onClick={handleDelete} style={{ color: '#f87171' }}>删除</button>
              </>
            )}
          </div>
        </div>
        {editing ? (
          <div>
            <div className="form-group">
              <label>标题</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>内容</label>
              <MarkdownEditor value={editContent} onChange={setEditContent} minHeight={150} />
            </div>
            <div className="flex gap-1">
              <button className="btn btn-sm" onClick={handleEditSave}>保存</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setEditing(false)}>取消</button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>{ticket.title}</h2>
            <MarkdownPreview content={ticket.content} />
            {ticket.reply && (
              <div className="mt-2" style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                <div className="text-sm text-muted mb-1">管理员回复:</div>
                <MarkdownPreview content={ticket.reply} />
              </div>
            )}
          </>
        )}
      </div>

      {isAdmin && (
        <div className="card mt-2">
          <div className="form-group">
            <label>回复 / 处理备注</label>
            <MarkdownEditor value={reply} onChange={setReply} minHeight={100} />
          </div>
          <div className="flex gap-2">
            {['pending', 'processing', 'resolved', 'closed'].map(s => (
              <button key={s} className="btn btn-sm btn-secondary" onClick={async () => {
                await api.patch(`/tickets/${id}`, { status: s, reply })
                setReply('')
                load()
              }}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
