import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import MarkdownEditor from '../components/MarkdownEditor'
import { formatTime } from '../utils'

export default function Tickets() {
  const { user } = useAuth()
  const limit = 25
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: '', title: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const isAdmin = user?.role === 'admin' || user?.id === 1

  const load = () => {
    const params = { page, limit }
    if (status) params.status = status
    if (category) params.category = category
    api.get('/tickets', params).then(setData).catch(() => {})
  }

  useEffect(() => { load() }, [page, status, category])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.content) return
    setSubmitting(true)
    try {
      await api.post('/tickets', form)
      setShowForm(false)
      setForm({ category: '', title: '', content: '' })
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id, newStatus) => {
    try {
      await api.patch(`/tickets/${id}`, { status: newStatus })
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  if (!data) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container">
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ margin: 0 }}>工单 <span>系统</span></h1>
        <button className="btn btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消' : '创建工单'}
        </button>
      </div>

      {isAdmin && data.pendingCount > 0 && (
        <div className="card mb-2" style={{ borderColor: '#f59e0b' }}>
          <span className="text-sm" style={{ color: '#fbbf24' }}>挂起工单: {data.pendingCount} 个待处理</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-2">
          <div className="form-group">
            <label>分类</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">请选择</option>
              {data.categories?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>标题</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>内容</label>
            <MarkdownEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} minHeight={120} />
          </div>
          <button type="submit" className="btn" disabled={submitting}>{submitting ? '提交中...' : '提交'}</button>
        </form>
      )}

      <div className="card mb-2">
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${!status ? '' : 'btn-secondary'}`} onClick={() => { setStatus(''); setPage(1) }}>全部</button>
          {['open', 'pending', 'processing', 'resolved', 'closed'].map(s => (
            <button key={s} className={`btn btn-sm ${status === s ? '' : 'btn-secondary'}`} onClick={() => { setStatus(s); setPage(1) }}>{s}</button>
          ))}
        </div>
        {isAdmin && data.categories && (
          <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
            {data.categories.map(c => (
              <button key={c} className={`btn btn-sm ${category === c ? '' : 'btn-secondary'}`} onClick={() => { setCategory(category === c ? '' : c); setPage(1) }}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>ID</th><th>分类</th><th>标题</th><th>状态</th>{isAdmin && <th>用户</th>}<th>时间</th>{isAdmin && <th>操作</th>}</tr>
          </thead>
          <tbody>
            {data.tickets?.map(t => {
              let badgeClass = 'badge-pending'
              if (t.status === 'resolved' || t.status === 'closed') badgeClass = 'badge-ok'
              else if (t.status === 'processing') badgeClass = 'badge-manual'
              else if (t.status === 'pending') badgeClass = 'badge-tle'
              return (
                <tr key={t.id}>
                  <td className="text-sm text-muted">{t.id}</td>
                  <td className="text-sm">{t.category || '-'}</td>
                  <td><Link to={`/tickets/${t.id}`}>{t.title}</Link></td>
                  <td><span className={`badge ${badgeClass}`}>{t.status}</span></td>
                  {isAdmin && <td className="text-sm text-muted"><Link to={`/users/${t.user_id}`} className="text-muted">{t.username}</Link></td>}
                  <td className="text-sm text-muted">{formatTime(t.created_at)}</td>
                  {isAdmin && (
                    <td>
                      <select className="text-sm" style={{ width: 'auto', padding: '0.2rem' }} value={t.status}
                        onChange={e => handleUpdate(t.id, e.target.value)}>
                        <option value="open">open</option>
                        <option value="pending">pending</option>
                        <option value="processing">processing</option>
                        <option value="resolved">resolved</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                  )}
                </tr>
              )
            })}
            {(!data.tickets || data.tickets.length === 0) && (
              <tr><td colSpan={isAdmin ? 7 : 5} className="text-center text-muted" style={{ padding: '2rem' }}>暂无工单</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={!data.tickets || data.tickets.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
