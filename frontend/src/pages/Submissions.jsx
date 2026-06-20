import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatTime } from '../utils'

const statusBadge = (s) => {
  const key = s.toLowerCase().replace(/\s+/g, '-')
  return <span className={`badge badge-${key}`}>{s}</span>
}

export default function Submissions() {
  const [subs, setSubs] = useState([])
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState({ user: '', problem: '' })
  const limit = 30

  useEffect(() => {
    const params = { page, limit }
    if (filter.user) params.user = filter.user
    if (filter.problem) params.problem = filter.problem
    api.get('/submissions', params).then(setSubs).catch(() => {})
  }, [page, filter])

  return (
    <div className="container">
      <h1 className="page-title">提交 <span>记录</span></h1>

      <div className="card mb-2">
        <div className="form-row">
          <div className="form-group" style={{ margin: 0 }}>
            <label>用户名</label>
            <input placeholder="按用户筛选" value={filter.user} onChange={e => { setFilter(f => ({ ...f, user: e.target.value })); setPage(1) }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>题目 ID</label>
            <input placeholder="按题目 ID 筛选" value={filter.problem} onChange={e => { setFilter(f => ({ ...f, problem: e.target.value })); setPage(1) }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>ID</th><th>用户</th><th>题目</th><th>语言</th><th>状态</th><th>耗时</th><th>内存</th><th>时间</th></tr>
          </thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id}>
                <td className="text-sm text-muted">{s.id}</td>
                <td className="text-sm">{s.username}{s.tags && s.tags.split(',').filter(Boolean).map(t => <span key={t} className="user-tag">{t}</span>)}</td>
                <td className="text-sm"><Link to={`/problems/${s.problem_id}`}>{s.problem_title}</Link></td>
                <td className="text-sm text-muted">{s.language}</td>
                <td><Link to={`/submissions/${s.id}`} style={{ color: 'inherit' }}>{statusBadge(s.status)}</Link></td>
                <td className="text-sm text-muted">{s.runtime}ms</td>
                <td className="text-sm text-muted">{s.memory}KB</td>
                <td className="text-sm text-muted">{formatTime(s.created_at)}</td>
              </tr>
            ))}
            {subs.length === 0 && <tr><td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>暂无提交记录</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={subs.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
