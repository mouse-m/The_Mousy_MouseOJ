import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Leaderboard() {
  const [users, setUsers] = useState([])
  const [range, setRange] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  useEffect(() => {
    const params = { page, limit }
    if (range) params.range = range
    api.get('/leaderboard', params).then(setUsers).catch(() => {})
  }, [range, page])

  return (
    <div className="container">
      <h1 className="page-title">排行榜 <span>Leaderboard</span></h1>

      <div className="card mb-2">
        <div className="flex gap-2">
          {['', 'week', 'month'].map(r => (
            <button key={r} className={`btn btn-sm ${range === r ? '' : 'btn-secondary'}`} onClick={() => { setRange(r); setPage(1) }}>
              {r || '总榜'}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th style={{ width: 50 }}>#</th><th>用户</th><th>AC 数</th><th>提交数</th><th>Rating</th></tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}>
                <td className="text-sm text-muted">{i + 1 + (page - 1) * limit}</td>
                <td><Link to={`/users/${u.id}`} style={{ fontWeight: 600 }}>{u.username}</Link></td>
                <td><span className="badge badge-ok">{u.ac_count}</span></td>
                <td className="text-sm text-muted">{u.total_submissions}</td>
                <td className="text-sm text-muted">{u.rating}</td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>暂无数据</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={users.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
