import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <div style={{
        fontSize: '8rem', fontWeight: 'bold', lineHeight: 1, marginBottom: '1rem'
      }}>
        <span style={{ color: '#38bdf8', textShadow: '0 0 30px rgba(56,189,248,0.5)' }}>4</span>
        <span style={{ color: '#f472b6', textShadow: '0 0 30px rgba(244,114,182,0.5)' }}>0</span>
        <span style={{ color: '#38bdf8', textShadow: '0 0 30px rgba(56,189,248,0.5)' }}>4</span>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
        Runtime Error: Page Not Found
      </p>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
        这道题...啊不，这个页面不存在
      </p>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
        padding: '1rem 1.5rem', margin: '1.5rem auto', maxWidth: 400,
        textAlign: 'left', fontSize: '0.85rem', color: '#64748b'
      }}>
        <span style={{ color: '#475569' }}>// 你访问的页面可能已被删除或从未存在</span><br />
        <span style={{ color: '#f472b6' }}>if</span> (page.<span style={{ color: '#86efac' }}>exists</span>()) &#123;<br />
        &nbsp;&nbsp;<span style={{ color: '#f472b6' }}>return</span> page.render();<br />
        &#125; <span style={{ color: '#f472b6' }}>else</span> &#123;<br />
        &nbsp;&nbsp;<span style={{ color: '#f472b6' }}>throw</span> <span style={{ color: '#86efac' }}>'404 Not Found'</span>;<br />
        &#125;
      </div>
      <Link to="/" className="btn">← 返回首页</Link>
    </div>
  )
}
