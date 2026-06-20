import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatTime, getAvatarUrl, usernameColor } from '../utils'

export default function Profile() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const isMe = me && me.id === parseInt(id)
  const [tab, setTab] = useState('ac')
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')

  const handleChangePwd = async () => {
    if (!oldPwd || !newPwd) return
    if (newPwd.length < 6) { setPwdMsg('新密码至少 6 位'); return }
    try {
      await api.patch('/auth/password', { old_password: oldPwd, new_password: newPwd })
      setPwdMsg('密码修改成功')
      setOldPwd('')
      setNewPwd('')
    } catch (e) {
      setPwdMsg(e.message)
    }
  }

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
    <div className="container" style={{ maxWidth: 800 }}>
      {/* ====== 头部简介卡 ====== */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={getAvatarUrl(profile.username, profile.avatar)} alt="avatar"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
            {isMe && (
              <>
                <input type="file" accept="image/*" ref={fileRef} onChange={handleAvatarUpload} style={{ display: 'none' }} />
                <button className="btn btn-sm btn-secondary" style={{ position: 'absolute', bottom: -2, right: -2, padding: '0.1rem 0.35rem', fontSize: '0.65rem', lineHeight: 1.2 }}
                  onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? '...' : '换'}
                </button>
              </>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`${profile.online ? 'online-dot' : 'offline-dot'}`}></span>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: usernameColor(profile.role) }}>
                {profile.username}
              </h1>
              {profile.role === 'admin' && <span className="badge badge-ok" style={{ fontSize: '0.7rem' }}>管理员</span>}
              {profile.tags?.map(t => <span key={t} className="user-tag">{t}</span>)}
            </div>
            {profile.bio && <p className="text-sm mt-1" style={{ color: '#94a3b8', margin: '0.25rem 0' }}>{profile.bio}</p>}
            <div className="text-sm text-muted mt-1" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to={`/users/${id}/following`} className="text-muted">关注 {profile.following_count ?? 0}</Link>
              <Link to={`/users/${id}/followers`} className="text-muted">粉丝 {profile.follower_count ?? 0}</Link>
              <span>加入于 {formatTime(profile.created_at)}</span>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {!isMe && me && (
              <button className={`btn btn-sm ${profile.is_following ? 'btn-secondary' : ''}`} onClick={handleFollow} style={{ whiteSpace: 'nowrap' }}>
                {profile.is_following ? '已关注' : '关注'}
              </button>
            )}
          </div>
        </div>

        {/* 统计条 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
          {[
            { label: 'AC 题目', value: profile.stats?.ac_problems ?? 0, color: '#38bdf8' },
            { label: '提交次数', value: profile.stats?.total_submissions ?? 0, color: '#e2e8f0' },
            { label: '文章', value: profile.stats?.articles ?? 0, color: '#e2e8f0' },
            { label: '帖子', value: profile.stats?.topics ?? 0, color: '#e2e8f0' },
          ].map(s => (
            <div key={s.label} className="text-center" style={{ background: '#1e293b', borderRadius: 8, padding: '0.6rem 0.5rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div className="text-xs text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ====== Tab 切换栏 ====== */}
      <div style={{ display: 'flex', gap: 0, margin: '1rem 0', borderBottom: '2px solid #1e293b' }}>
        {[
          { key: 'ac', label: '最近 AC' },
          { key: 'activities', label: '动态' },
          { key: 'settings', label: '设置' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              color: tab === t.key ? '#38bdf8' : '#64748b', fontWeight: tab === t.key ? 600 : 400,
              borderBottom: tab === t.key ? '2px solid #38bdf8' : '2px solid transparent',
              marginBottom: -2, fontSize: '0.9rem', transition: 'color 0.15s'
            }}>{t.label}</button>
        ))}
      </div>

      {/* ====== 最近 AC ====== */}
      {tab === 'ac' && (
        profile.recent_ac?.length > 0 ? (
          <div className="card" style={{ padding: 0 }}>
            {profile.recent_ac.map((p, i) => (
              <Link key={p.id} to={`/problems/${p.id}`}
                style={{
                  display: 'block', padding: '0.7rem 1rem', textDecoration: 'none',
                  borderBottom: i < profile.recent_ac.length - 1 ? '1px solid #1e293b' : 'none'
                }}>
                <span style={{ color: '#4ade80', fontWeight: 600 }}>AC</span>
                <span style={{ color: '#e2e8f0', marginLeft: '0.5rem' }}>{p.title}</span>
              </Link>
            ))}
          </div>
        ) : <p className="text-sm text-muted text-center" style={{ padding: '2rem' }}>暂无 AC 记录</p>
      )}

      {/* ====== 动态 ====== */}
      {tab === 'activities' && (
        <div className="card" style={{ padding: '1rem' }}>
          <Link to={`/users/${id}/activities`} className="btn btn-sm btn-secondary">查看全部动态</Link>
        </div>
      )}

      {/* ====== 设置 ====== */}
      {tab === 'settings' && isMe && (
        <>
          <div className="card">
            <div className="card-header"><h2>修改密码</h2></div>
            <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="旧密码" style={{ flex: 1, minWidth: 120 }} />
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="新密码" style={{ flex: 1, minWidth: 120 }} />
              <button className="btn btn-sm" onClick={handleChangePwd}>修改</button>
            </div>
            {pwdMsg && <div className={`text-sm mt-1`} style={{ color: pwdMsg === '密码修改成功' ? '#4ade80' : '#f87171' }}>{pwdMsg}</div>}
          </div>
          <div className="card mt-2" style={{ padding: '1rem' }}>
            <Link to={`/users/${id}/following`} className="btn btn-sm btn-secondary" style={{ marginRight: '0.5rem' }}>关注列表</Link>
            <Link to={`/users/${id}/followers`} className="btn btn-sm btn-secondary" style={{ marginRight: '0.5rem' }}>粉丝列表</Link>
            <Link to={`/users/${id}/activities`} className="btn btn-sm btn-secondary">动态</Link>
          </div>
        </>
      )}
    </div>
  )
}
