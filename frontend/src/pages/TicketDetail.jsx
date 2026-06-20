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

  const handleReply = async () => {
    if (!reply.trim()) return
    try {
      await api.post(`/tickets/${id}/replies`, { content: reply })
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
            <span className="text-sm text-muted"><Link to={`/users/${ticket.user_id}`} className="text-muted">{ticket.username}</Link> · {formatTime(ticket.created_at)}</span>
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
          </>
        )}
      </div>

      {(ticket.replies?.length > 0) && (
        <div className="card mt-2">
          <div className="card-header"><h2>回复 ({ticket.replies.length})</h2></div>
          {ticket.replies.map(r => (
            <div key={r.id} className="mb-2" style={{ borderLeft: '2px solid #334155', paddingLeft: '0.75rem' }}>
              <div className="flex-between mb-1">
                <span className="text-sm" style={{ color: '#38bdf8', fontWeight: 600 }}>{r.username}</span>
                <span className="text-sm text-muted">{formatTime(r.created_at)}</span>
              </div>
              <MarkdownPreview content={r.content} />
            </div>
          ))}
        </div>
      )}

      {(isAdmin || (user && user.id === ticket.user_id)) && ticket.status !== 'closed' && (
        <div className="card mt-2">
          <div className="form-group">
            <label>回复</label>
            <MarkdownEditor value={reply} onChange={setReply} minHeight={100} />
          </div>
          <div className="flex gap-1">
            <button className="btn btn-sm" onClick={handleReply}>发送回复</button>
            {isAdmin && ['pending', 'processing', 'resolved', 'closed'].map(s => (
              <button key={s} className="btn btn-sm btn-secondary" onClick={async () => {
                if (reply.trim()) {
                  await api.post(`/tickets/${id}/replies`, { content: reply })
                  setReply('')
                }
                await api.patch(`/tickets/${id}`, { status: s })
                load()
              }}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
