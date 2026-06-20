import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function Preview({ content }) {
  if (!content) return <span style={{ color: '#64748b', fontSize: '0.85rem' }}>预览</span>
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            if (!inline && match) {
              return (
                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              )
            }
            return <code className={className} {...props}>{children}</code>
          }
        }}
      >{content}</ReactMarkdown>
    </div>
  )
}

export default function MarkdownEditor({ value, onChange, minHeight = 200, placeholder = '' }) {
  const [tab, setTab] = useState('edit')

  return (
    <div className="markdown-editor" style={{ border: '1px solid #334155', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #334155', background: '#1e293b' }}>
        <button type="button" onClick={() => setTab('edit')}
          style={{ padding: '0.4rem 1rem', border: 'none', background: tab === 'edit' ? '#0f172a' : 'transparent', color: tab === 'edit' ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === 'edit' ? 600 : 400 }}>编辑</button>
        <button type="button" onClick={() => setTab('preview')}
          style={{ padding: '0.4rem 1rem', border: 'none', background: tab === 'preview' ? '#0f172a' : 'transparent', color: tab === 'preview' ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === 'preview' ? 600 : 400 }}>预览</button>
      </div>
      {tab === 'edit' ? (
        <div style={{ display: 'flex', minHeight }}>
          <textarea value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, border: 'none', borderRadius: 0, resize: 'vertical', fontFamily: 'inherit', minHeight }} />
          <div style={{ width: '1px', background: '#334155' }}></div>
          <div style={{ flex: 1, padding: '0.75rem', overflow: 'auto', background: '#0f172a' }}>
            <Preview content={value} />
          </div>
        </div>
      ) : (
        <div style={{ padding: '0.75rem', minHeight, overflow: 'auto', background: '#0f172a' }}>
          <Preview content={value} />
        </div>
      )}
    </div>
  )
}
