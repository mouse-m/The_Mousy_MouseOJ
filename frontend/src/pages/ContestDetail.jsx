import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import MarkdownPreview from '../components/MarkdownPreview'

export default function ContestDetail() {
  const { id } = useParams()
  const [contest, setContest] = useState(null)

  useEffect(() => {
    api.get(`/contests/${id}`).then(setContest).catch(() => {})
  }, [id])

  if (!contest) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container">
      <Link to="/contests" className="text-sm text-muted">← 返回比赛列表</Link>
      <h1 className="page-title mt-2">{contest.title}</h1>
      <div className="text-sm text-muted mb-2">
        {new Date(contest.start_time).toLocaleString('zh-CN')} ~ {new Date(contest.end_time).toLocaleString('zh-CN')}
      </div>

      <div className="card mb-2">
        <MarkdownPreview content={contest.description || '暂无描述'} />
      </div>

      <h2 className="text-sm text-muted mb-1">题目列表</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>题号</th><th>标题</th></tr></thead>
          <tbody>
            {contest.problems?.map(p => (
              <tr key={p.label}>
                <td className="text-sm" style={{ fontWeight: 600, width: 60 }}>{p.label}</td>
                <td><Link to={`/problems/${p.id}`}>{p.title}</Link></td>
              </tr>
            ))}
            {(!contest.problems || contest.problems.length === 0) && (
              <tr><td colSpan={2} className="text-center text-muted" style={{ padding: '2rem' }}>暂无题目</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
