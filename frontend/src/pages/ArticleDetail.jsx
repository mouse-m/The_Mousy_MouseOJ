import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import MarkdownPreview from '../components/MarkdownPreview'
import { formatTime, usernameColor, getAvatarUrl } from '../utils'

export default function ArticleDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [article, setArticle] = useState(null)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')

  const loadArticle = () => {
    api.get(`/articles/${id}`).then(a => {
      setArticle(a)
      setLiked(!!a.liked)
      setDisliked(!!a.disliked)
      setBookmarked(!!a.bookmarked)
    }).catch(() => {})
  }

  const loadComments = () => {
    api.get(`/articles/${id}/comments`).then(setComments).catch(() => {})
  }

  useEffect(() => { loadArticle(); loadComments() }, [id])

  const handleLike = async () => {
    if (!user) return
    try {
      const res = await api.post(`/articles/${id}/like`)
      setLiked(res.liked)
      if (res.liked && disliked) setDisliked(false)
      setArticle(a => ({
        ...a, likes: a.likes + (res.liked ? 1 : -1),
        dislikes: res.liked && a.dislikes > 0 ? a.dislikes - 1 : a.dislikes
      }))
    } catch {}
  }

  const handleDislike = async () => {
    if (!user) return
    try {
      const res = await api.post(`/articles/${id}/dislike`)
      setDisliked(res.disliked)
      if (res.disliked && liked) setLiked(false)
      setArticle(a => ({
        ...a, dislikes: a.dislikes + (res.disliked ? 1 : -1),
        likes: res.disliked && a.likes > 0 ? a.likes - 1 : a.likes
      }))
    } catch {}
  }

  const handleBookmark = async () => {
    if (!user) return
    try {
      const res = await api.post(`/articles/${id}/bookmark`)
      setBookmarked(res.bookmarked)
    } catch {}
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    try {
      await api.post(`/articles/${id}/comments`, { content: commentText })
      setCommentText('')
      loadComments()
    } catch (e) { alert(e.message) }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('确定删除此评论？')) return
    try {
      await api.delete(`/comments/${commentId}`)
      loadComments()
    } catch (e) { alert(e.message) }
  }

  if (!article) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <Link to="/articles" className="text-sm text-muted">← 返回文章列表</Link>
      <h1 className="page-title mt-2">{article.title}</h1>
      <div className="text-sm text-muted mb-2">
        <Link to={`/users/${article.user_id}`} style={{ color: '#38bdf8', fontWeight: 600 }}>{article.author}</Link> · {formatTime(article.created_at)}
      </div>

      <div className="card">
        <MarkdownPreview content={article.content} />
      </div>

      <div className="flex gap-2 mt-2" style={{ alignItems: 'center' }}>
        <button className={`btn btn-sm ${liked ? '' : 'btn-secondary'}`} onClick={handleLike}>
          {liked ? '已赞' : '点赞'} ({article.likes})
        </button>
        <button className={`btn btn-sm ${disliked ? 'btn-danger' : 'btn-secondary'}`} onClick={handleDislike}>
          {disliked ? '已踩' : '踩'} ({article.dislikes})
        </button>
        <button className={`btn btn-sm ${bookmarked ? '' : 'btn-secondary'}`} onClick={handleBookmark}>
          {bookmarked ? '已收藏' : '收藏'}
        </button>
      </div>

      {/* 评论区 */}
      <div className="card mt-2">
        <div className="card-header"><h2>评论 ({comments.length})</h2></div>
        {user && (
          <div className="flex gap-1 mb-2" style={{ alignItems: 'flex-start' }}>
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="写下你的评论..." rows={2} maxLength={500}
              style={{ flex: 1, minHeight: 60, resize: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }} />
            <button className="btn btn-sm" onClick={handleComment} disabled={!commentText.trim()}>发表</button>
          </div>
        )}
        {comments.length === 0 ? (
          <p className="text-sm text-muted text-center" style={{ padding: '1rem' }}>暂无评论</p>
        ) : (
          comments.map((c, i) => (
            <div key={c.id} style={{
              padding: '0.75rem 0', borderBottom: i < comments.length - 1 ? '1px solid #1e293b' : 'none'
            }}>
              <div className="flex-between mb-1">
                <div className="flex gap-1" style={{ alignItems: 'center' }}>
                  <img src={getAvatarUrl(c.username, c.avatar)} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                  <Link to={`/users/${c.user_id}`} style={{ color: usernameColor(c.role, c.rating), fontWeight: 600, fontSize: '0.85rem' }}>{c.username}</Link>
                  <span className="text-sm text-muted">{formatTime(c.created_at)}</span>
                </div>
                {(user && (user.id === c.user_id || user.role === 'admin')) && (
                  <button className="btn-sm btn-secondary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}
                    onClick={() => handleDeleteComment(c.id)}>删除</button>
                )}
              </div>
              <div className="text-sm" style={{ color: '#e2e8f0' }}>{c.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
