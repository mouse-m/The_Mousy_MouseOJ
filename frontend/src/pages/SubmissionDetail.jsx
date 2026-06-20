import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { formatTime } from '../utils'

const FINAL_STATUSES = new Set([
  'Accepted', 'Wrong Answer', 'Time Limit Exceed', 'Memory Limit Exceed',
  'Runtime Error', 'Compile Error', 'Presentation Error', 'Output Limit Exceed',
])

const statusBadge = (s) => {
  const key = s.toLowerCase().replace(/\s+/g, '-')
  return <span className={`badge badge-${key}`}>{s}</span>
}

export default function SubmissionDetail() {
  const { id } = useParams()
  const [sub, setSub] = useState(null)

  useEffect(() => {
    let timer
    const fetchSub = async () => {
      try {
        const data = await api.get(`/submissions/${id}`)
        setSub(data)
        if (!FINAL_STATUSES.has(data.status) && data.status !== 'Manual' && data.status !== 'Submit Error') {
          timer = setTimeout(fetchSub, 2000)
        }
      } catch {
        setSub({ error: '获取失败' })
      }
    }
    fetchSub()
    return () => clearTimeout(timer)
  }, [id])

  if (!sub) return <div className="container"><div className="loading">加载中...</div></div>
  if (sub.error) return <div className="container"><div className="card"><p className="error-msg">{sub.error}</p></div></div>

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <Link to="/submissions" className="text-sm text-muted">← 返回提交列表</Link>
      <h1 className="page-title mt-2">评测结果 <span>#{sub.id}</span></h1>

      <div className="card mb-2">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div><span className="text-sm text-muted">状态: </span>{statusBadge(sub.status)}</div>
          <div><span className="text-sm text-muted">题目: </span><Link to={`/problems/${sub.problem_id}`}>{sub.problem_title || `#${sub.problem_id}`}</Link></div>
          <div><span className="text-sm text-muted">语言: </span>{sub.language}</div>
          <div><span className="text-sm text-muted">耗时: </span>{sub.runtime}ms</div>
          <div><span className="text-sm text-muted">内存: </span>{sub.memory}KB</div>
          <div><span className="text-sm text-muted">时间: </span>{formatTime(sub.created_at)}</div>
        </div>
        {!FINAL_STATUSES.has(sub.status) && sub.status !== 'Manual' && sub.status !== 'Submit Error' && (
          <div className="text-sm text-muted mt-2" style={{ color: '#fbbf24' }}>评测中，自动刷新...</div>
        )}
      </div>

      <div className="card">
        <h2 className="card-header" style={{ border: 0, padding: 0, marginBottom: '0.75rem' }}>提交代码</h2>
        <pre><code>{sub.code}</code></pre>
      </div>
    </div>
  )
}
