import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import './Layout.css'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-inner">
          <Link to="/" className="nav-brand">Mouse<span>OJ</span></Link>
          <div className="nav-links">
            <Link to="/problems">题库</Link>
            <Link to="/forums">讨论区</Link>
            <Link to="/articles">文章</Link>
            <Link to="/contests">比赛</Link>
            <Link to="/leaderboard">排行榜</Link>
            <Link to="/submissions">提交</Link>
            <Link to="/tickets">工单</Link>
          </div>
          <div className="nav-sep"></div>
          <div className="nav-right">
            {user ? (
              <div className="nav-user">
                <Link to={`/users/${user.id}`} className="nav-username">{user.username}</Link>
                <button className="btn btn-sm btn-secondary" onClick={handleLogout}>退出</button>
              </div>
            ) : (
              <div className="nav-user">
                <Link to="/login" className="btn btn-sm">登录</Link>
                <Link to="/register" className="btn btn-sm btn-secondary">注册</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  )
}
