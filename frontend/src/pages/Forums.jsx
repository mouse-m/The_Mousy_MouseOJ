import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Forums() {
  const [forums, setForums] = useState([])

  useEffect(() => {
    api.get('/forums').then(setForums).catch(() => {})
  }, [])

  return (
    <div className="container">
      <h1 className="page-title">讨论 <span>版块</span></h1>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>版块</th><th>主题数</th></tr>
          </thead>
          <tbody>
            {forums.map(f => (
              <tr key={f.id}>
                <td><Link to={`/forums/${f.slug}`} style={{ fontWeight: 600 }}>{f.name}</Link></td>
                <td className="text-sm text-muted">{f.topic_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
