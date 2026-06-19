import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function TicketDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const isAdmin = user?.role === 'admin' || user?.id === 1
  const [reply, setReply] = useState('')

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

  if (!ticket) return <div className="container"><div className="loading">加载中...</div></div>

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
          <span className="text-sm text-muted">{ticket.username} · {new Date(ticket.created_at).toLocaleString('zh-CN')}</span>
        </div>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>{ticket.title}</h2>
        <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{ticket.content}</div>

        {ticket.reply && (
          <div className="mt-2" style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
            <div className="text-sm text-muted mb-1">管理员回复:</div>
            <div style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ticket.reply}</div>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="card mt-2">
          <div className="form-group">
            <label>回复 / 处理备注</label>
            <textarea value={reply} onChange={e => setReply(e.target.value)} style={{ minHeight: 100 }} />
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
