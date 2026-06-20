import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function Preview({ content }) {
  if (!content) return <span style={{ color: '#64748b', fontSize: '0.85rem' }}>预览</span>
  const processed = content.replace(/@(\S+)/g, '[$&](/users/by-name/$1)')
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkEmoji]}
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
      >{processed}</ReactMarkdown>
    </div>
  )
}

export default function MarkdownEditor({ value, onChange, minHeight = 200, placeholder = '' }) {
  const [mode, setMode] = useState('split')

  return (
    <div className="markdown-editor" style={{ border: '1px solid #334155', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #334155', background: '#1e293b' }}>
        <button type="button" onClick={() => setMode('edit')}
          style={{ padding: '0.4rem 1rem', border: 'none', background: mode === 'edit' ? '#0f172a' : 'transparent', color: mode === 'edit' ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: mode === 'edit' ? 600 : 400 }}>纯编辑</button>
        <button type="button" onClick={() => setMode('split')}
          style={{ padding: '0.4rem 1rem', border: 'none', background: mode === 'split' ? '#0f172a' : 'transparent', color: mode === 'split' ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: mode === 'split' ? 600 : 400 }}>分栏</button>
        <button type="button" onClick={() => setMode('preview')}
          style={{ padding: '0.4rem 1rem', border: 'none', background: mode === 'preview' ? '#0f172a' : 'transparent', color: mode === 'preview' ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: mode === 'preview' ? 600 : 400 }}>纯预览</button>
      </div>
      {mode === 'edit' ? (
        <div style={{ minHeight }}>
          <textarea value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ width: '100%', border: 'none', borderRadius: 0, resize: 'vertical', fontFamily: 'inherit', minHeight }} />
        </div>
      ) : mode === 'preview' ? (
        <div style={{ padding: '0.75rem', minHeight, overflow: 'auto', background: '#0f172a' }}>
          <Preview content={value} />
        </div>
      ) : (
        <div style={{ display: 'flex', minHeight }}>
          <textarea value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, border: 'none', borderRadius: 0, resize: 'vertical', fontFamily: 'inherit', minHeight }} />
          <div style={{ width: '1px', background: '#334155' }}></div>
          <div style={{ flex: 1, padding: '0.75rem', overflow: 'auto', background: '#0f172a' }}>
            <Preview content={value} />
          </div>
        </div>
      )}
    </div>
  )
}
