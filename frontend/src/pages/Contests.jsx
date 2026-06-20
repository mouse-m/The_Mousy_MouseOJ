import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatTime } from '../utils'

export default function Contests() {
  const [contests, setContests] = useState([])
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const limit = 25

  useEffect(() => {
    const params = { page, limit }
    if (status) params.status = status
    api.get('/contests', params).then(setContests).catch(() => {})
  }, [status, page])

  const now = new Date()

  return (
    <div className="container">
      <h1 className="page-title">比赛 <span>列表</span></h1>

      <div className="card mb-2">
        <div className="flex gap-2">
          {['', 'upcoming', 'running', 'ended'].map(s => (
            <button key={s} className={`btn btn-sm ${status === s ? '' : 'btn-secondary'}`} onClick={() => { setStatus(s); setPage(1) }}>
              {s || '全部'}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>标题</th><th>开始</th><th>结束</th><th>状态</th></tr>
          </thead>
          <tbody>
            {contests.map(c => {
              const start = new Date(c.start_time)
              const end = new Date(c.end_time)
              let statusText = ''
              let statusClass = ''
              if (now < start) { statusText = '未开始'; statusClass = 'badge-manual' }
              else if (now > end) { statusText = '已结束'; statusClass = 'badge-submit-error' }
              else { statusText = '进行中'; statusClass = 'badge-ok' }
              return (
                <tr key={c.id}>
                  <td><Link to={`/contests/${c.id}`}>{c.title}</Link></td>
                  <td className="text-sm text-muted">{formatTime(start.toISOString())}</td>
                  <td className="text-sm text-muted">{formatTime(end.toISOString())}</td>
                  <td><span className={`badge ${statusClass}`}>{statusText}</span></td>
                </tr>
              )
            })}
            {contests.length === 0 && <tr><td colSpan={4} className="text-center text-muted" style={{ padding: '2rem' }}>暂无比赛</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={contests.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
