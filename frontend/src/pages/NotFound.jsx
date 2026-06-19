import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1 style={{ fontSize: '5rem', color: '#38bdf8' }}>404</h1>
      <p className="text-muted mb-2">页面不存在</p>
      <Link to="/" className="btn">返回首页</Link>
    </div>
  )
}
