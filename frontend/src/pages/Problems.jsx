import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Problems() {
  const [problems, setProblems] = useState([])
  const [tags, setTags] = useState([])
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState({ tag: '', difficulty: '', q: '' })
  const limit = 25

  useEffect(() => {
    api.get('/tags').then(setTags).catch(() => {})
  }, [])

  useEffect(() => {
    const params = { page, limit }
    if (filter.tag) params.tag = filter.tag
    if (filter.difficulty) params.difficulty = filter.difficulty
    if (filter.q) params.q = filter.q
    api.get('/problems', params).then(setProblems).catch(() => {})
  }, [page, filter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div className="container">
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ margin: 0 }}>题目 <span>题库</span></h1>
      </div>

      <div className="card mb-2">
        <form onSubmit={handleSearch} className="form-row" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>搜索</label>
            <input placeholder="题目名称" value={filter.q} onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>标签</label>
            <select value={filter.tag} onChange={e => { setFilter(f => ({ ...f, tag: e.target.value })); setPage(1) }}>
              <option value="">全部</option>
              {tags.map(t => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>难度</label>
            <select value={filter.difficulty} onChange={e => { setFilter(f => ({ ...f, difficulty: e.target.value })); setPage(1) }}>
              <option value="">全部</option>
              {[1,2,3,4,5].map(d => <option key={d} value={d}>{'★'.repeat(d)}{'☆'.repeat(5-d)}</option>)}
            </select>
          </div>
          <button type="submit" className="btn">搜索</button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th style={{ width: 60 }}>#</th><th>标题</th><th>来源</th><th>难度</th><th>时间</th><th>内存</th></tr>
          </thead>
          <tbody>
            {problems.map(p => (
              <tr key={p.id}>
                <td className="text-muted">{p.id}</td>
                <td><Link to={`/problems/${p.id}`}>{p.title}</Link></td>
                <td className="text-sm text-muted">{p.vjudge_oj ? `${p.vjudge_oj} ${p.vjudge_prob}` : '-'}</td>
                <td>{p.difficulty ? <span className="text-sm">{'★'.repeat(p.difficulty)}</span> : '-'}</td>
                <td className="text-sm text-muted">{p.time_limit}ms</td>
                <td className="text-sm text-muted">{p.mem_limit}MB</td>
              </tr>
            ))}
            {problems.length === 0 && <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>暂无题目</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button className="btn btn-sm btn-secondary" disabled={problems.length < limit} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
