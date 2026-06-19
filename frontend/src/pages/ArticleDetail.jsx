import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function ArticleDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [article, setArticle] = useState(null)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    api.get(`/articles/${id}`).then(setArticle).catch(() => {})
  }, [id])

  const handleLike = async () => {
    if (!user) return
    try {
      const res = await api.post(`/articles/${id}/like`)
      setLiked(res.liked)
      setArticle(a => ({ ...a, likes: a.likes + (res.liked ? 1 : -1) }))
    } catch {}
  }

  if (!article) return <div className="container"><div className="loading">加载中...</div></div>

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <Link to="/articles" className="text-sm text-muted">← 返回文章列表</Link>
      <h1 className="page-title mt-2">{article.title}</h1>
      <div className="text-sm text-muted mb-2">
        {article.author} · {new Date(article.created_at).toLocaleString('zh-CN')}
      </div>

      <div className="card">
        <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{article.content}</div>
      </div>

      <div className="flex gap-2 mt-2">
        <button className="btn btn-sm btn-secondary" onClick={handleLike}>
          {liked ? '已赞' : '点赞'} ({article.likes})
        </button>
      </div>
    </div>
  )
}
