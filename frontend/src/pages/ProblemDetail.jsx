import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function ProblemDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [problem, setProblem] = useState(null)
  const [language, setLanguage] = useState('cpp')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.get(`/problems/${id}`).then(setProblem).catch(() => {})
  }, [id])

  const handleSubmit = async () => {
    if (!code.trim()) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await api.post('/submissions', { problemId: parseInt(id), language, code })
      setResult(res)
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (!problem) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container">
      <Link to="/problems" className="text-sm text-muted">← 返回题库</Link>
      <h1 className="page-title mt-2">{problem.title}</h1>

      {problem.tags?.length > 0 && (
        <div className="flex gap-1 mb-2" style={{ flexWrap: 'wrap' }}>
          {problem.tags.map(t => <span key={t} className="badge badge-pending">{t}</span>)}
        </div>
      )}

      <div className="flex gap-2 mb-2 text-sm text-muted">
        <span>时间限制: {problem.time_limit}ms</span>
        <span>内存限制: {problem.mem_limit}MB</span>
        {problem.difficulty > 0 && <span>难度: {'★'.repeat(problem.difficulty)}{'☆'.repeat(5 - problem.difficulty)}</span>}
        {problem.vjudge_oj && <span>来源: {problem.vjudge_oj} {problem.vjudge_prob}</span>}
      </div>

      <div className="card mb-2">
        <h2 className="card-header" style={{ border: 0, padding: 0, marginBottom: '0.75rem' }}>题目描述</h2>
        <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{problem.description || '暂无描述'}</div>
      </div>

      {user ? (
        <div className="card">
          <h2 className="card-header" style={{ border: 0, padding: 0, marginBottom: '0.75rem' }}>提交代码</h2>
          <div className="form-group">
            <label>语言</label>
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: 200 }}>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="java">Java</option>
              <option value="python3">Python 3</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>
          <div className="form-group">
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="在这里粘贴你的代码..."
              style={{ minHeight: 300, fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontSize: '0.85rem' }}
            />
          </div>
          <div className="flex-between">
            <button className="btn" onClick={handleSubmit} disabled={submitting || !code.trim()}>
              {submitting ? '提交中...' : '提交评测'}
            </button>
            {result && (
              <div>
                {result.error ? (
                  <span className="text-sm" style={{ color: '#f87171' }}>{result.error}</span>
                ) : (
                  <Link to={`/submissions/${result.id}`} className="text-sm">
                    查看评测结果 #{result.id}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-muted">请 <Link to="/login">登录</Link> 后提交代码</p>
        </div>
      )}

      {problem.my_status && Object.keys(problem.my_status).length > 0 && (
        <div className="card mt-2">
          <h2 className="card-header" style={{ border: 0, padding: 0, marginBottom: '0.75rem' }}>我的提交状态</h2>
          <div className="flex gap-2">
            {Object.entries(problem.my_status).map(([status, count]) => (
              <span key={status} className={`badge badge-${status.toLowerCase().replace(/\s+/g, '-')}`}>
                {status}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
