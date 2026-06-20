import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime } from '../utils'

export default function Profile() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const isMe = me && me.id === parseInt(id)

  const load = () => api.get(`/users/${id}`).then(setProfile).catch(() => {})

  useEffect(() => { load() }, [id])

  const handleFollow = async () => {
    try {
      const res = await api.post(`/users/${id}/follow`)
      setProfile(p => ({ ...p, is_following: res.following }))
    } catch {}
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { alert('头像不能超过 500KB'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上传失败')
      setProfile(p => ({ ...p, avatar: data.url }))
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (!profile) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <div className="card">
        <div className="flex-between">
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {profile.avatar ? (
                <img src={profile.avatar} alt="avatar"
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: '#334155', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.5rem', color: '#94a3b8'
                }}>{profile.username.slice(0, 1).toUpperCase()}</div>
              )}
              {isMe && (
                <>
                  <input type="file" accept="image/*" ref={fileRef} onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  <button className="btn btn-sm btn-secondary" style={{ position: 'absolute', bottom: -4, right: -4, padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                    onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? '...' : '更换头像'}
                  </button>
                </>
              )}
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0, marginBottom: '0.25rem' }}>
                <span className={`${profile.online ? 'online-dot' : 'offline-dot'}`}></span>
                {profile.username}
                {profile.tags?.map(t => <span key={t} className="user-tag">{t}</span>)}
              </h1>
              <div className="text-sm text-muted">
                {profile.role === 'admin' ? <span className="badge badge-ok">管理员</span> : null}
                {' '}加入于 {formatTime(profile.created_at)}
              </div>
              {profile.bio && <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>{profile.bio}</p>}
            </div>
          </div>
          {me && me.id !== profile.id && (
            <button className={`btn btn-sm ${profile.is_following ? 'btn-secondary' : ''}`} onClick={handleFollow}>
              {profile.is_following ? '已关注' : '关注'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card text-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>{profile.stats?.ac_problems || 0}</div>
          <div className="text-sm text-muted">AC 题目</div>
        </div>
        <div className="card text-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>{profile.stats?.total_submissions || 0}</div>
          <div className="text-sm text-muted">提交次数</div>
        </div>
        <div className="card text-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>{profile.stats?.articles || 0}</div>
          <div className="text-sm text-muted">文章</div>
        </div>
        <div className="card text-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>{profile.stats?.topics || 0}</div>
          <div className="text-sm text-muted">帖子</div>
        </div>
      </div>

      {profile.recent_ac?.length > 0 && (
        <div className="card">
          <h2 className="card-header" style={{ border: 0, padding: 0, marginBottom: '0.75rem' }}>最近 AC</h2>
          {profile.recent_ac.map(p => (
            <div key={p.id} className="mb-1">
              <Link to={`/problems/${p.id}`} className="text-sm">{p.title}</Link>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Link to={`/users/${id}/following`} className="btn btn-sm btn-secondary">关注列表</Link>
        <Link to={`/users/${id}/followers`} className="btn btn-sm btn-secondary">粉丝列表</Link>
        <Link to={`/users/${id}/activities`} className="btn btn-sm btn-secondary">动态</Link>
      </div>
    </div>
  )
}
