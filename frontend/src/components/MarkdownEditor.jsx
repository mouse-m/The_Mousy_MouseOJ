import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import remarkDirective from 'remark-directive'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { rehypeTableMerge, remarkDirectiveHandler, preprocessContent } from '../markdownPlugins'

function MermaidBlock({ code }) {
  const ref = useRef()
  useEffect(() => {
    if (ref.current) {
      import('mermaid').then(m => {
        m.default.run({ nodes: [ref.current] })
      })
    }
  }, [code])
  return <div className="mermaid" ref={ref}>{code}</div>
}

function CodeBlock({ node, children, className }) {
  const lang = (node?.lang || '').trim()
  const meta = (node?.meta || '').trim()
  const language = lang
  const lineNumbers = meta.includes('line-numbers')
  const linesMatch = meta.match(/lines=(\d+)-(\d+)/)
  const highlightStart = linesMatch ? parseInt(linesMatch[1]) : null
  const highlightEnd = linesMatch ? parseInt(linesMatch[2]) : null
  const code = String(children ?? '').replace(/\n$/, '')

  if (language === 'mermaid') return <MermaidBlock code={code} />

  if (lineNumbers || highlightStart) {
    const lines = code.split('\n')
    return (
      <div className={`code-block ${lineNumbers ? 'with-line-nums' : ''}`}>
        <SyntaxHighlighter
          style={oneDark}
          language={language || 'cpp'}
          PreTag="div"
          showLineNumbers={lineNumbers}
          wrapLines={highlightStart != null}
          lineProps={lineNumber => {
            if (highlightStart != null && lineNumber >= highlightStart && lineNumber <= highlightEnd) {
              return { style: { background: 'rgba(56, 189, 248, 0.12)', display: 'block' } }
            }
            return {}
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    )
  }

  return (
    <SyntaxHighlighter style={oneDark} language={language || 'cpp'} PreTag="div">
      {code}
    </SyntaxHighlighter>
  )
}

function Preview({ content }) {
  if (!content) return <span style={{ color: '#64748b', fontSize: '0.85rem' }}>预览</span>
  const processed = preprocessContent(content)
  const withMentions = processed.replace(/@(\S+)/g, '[$&](/users/by-name/$1)')
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkEmoji, remarkDirective, remarkDirectiveHandler]}
        rehypePlugins={[rehypeKatex, rehypeRaw, rehypeTableMerge]}
        components={{
          code({ node, inline, className, children, ...props }) {
            if (!inline) return <CodeBlock node={node} className={className}>{children}</CodeBlock>
            return <code className={className} {...props}>{children}</code>
          }
        }}
      >{withMentions}</ReactMarkdown>
    </div>
  )
}

const snippets = {
  bilibili: '![bilibili](BV1xx411c7mD)',
  info: ':::info[标题]\n内容\n:::',
  success: ':::success[标题]\n内容\n:::',
  warning: ':::warning[标题]\n内容\n:::',
  error: ':::error[标题]\n内容\n:::',
  'align-center': ':::align{center}\n内容\n:::',
  'align-right': ':::align{right}\n内容\n:::',
  epigraph: ':::epigraph[来源]\n引言内容\n:::',
  'cute-table': '::cute-table{tuack}\n| 列1 | 列2 |\n| :-: | :-: |\n| 内容 | 内容 |\n:::',
  'table-merge': '| 标题1 | 标题2 | 标题3 |\n| :-: | :-: | :-: |\n| A | B | C |\n| ^ | D | E |\n| 跨列 | < | F |',
}

export default function MarkdownEditor({ value, onChange, minHeight = 200, placeholder = '' }) {
  const [mode, setMode] = useState('split')
  const textRef = useRef(null)

  const insert = (key) => {
    const text = snippets[key]
    if (!text) return
    const ta = textRef.current
    if (!ta) { onChange(value + '\n' + text); return }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = value.substring(0, start)
    const after = value.substring(end)
    onChange(before + text + after)
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length
      ta.focus()
    })
  }

  const toolBtn = (label, title, snippetKey) => (
    <button key={snippetKey} type="button" title={title} onClick={() => insert(snippetKey)}
      style={{
        padding: '0.25rem 0.5rem', border: '1px solid #334155', borderRadius: 4, background: '#1e293b',
        color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap'
      }}>{label}</button>
  )

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
      <div style={{ display: 'flex', gap: '0.35rem', padding: '0.35rem 0.5rem', background: '#0f172a', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
        {toolBtn('B站', '嵌入B站视频', 'bilibili')}
        {toolBtn('ℹ️', '信息折叠框', 'info')}
        {toolBtn('✅', '成功折叠框', 'success')}
        {toolBtn('⚠️', '警告折叠框', 'warning')}
        {toolBtn('❌', '错误折叠框', 'error')}
        {toolBtn('居中', '居中排版', 'align-center')}
        {toolBtn('居右', '居右排版', 'align-right')}
        {toolBtn('引言', '引言', 'epigraph')}
        {toolBtn('Tuack', 'Tuack风格表格', 'cute-table')}
        {toolBtn('合并表', '表格合并示例', 'table-merge')}
      </div>
      {mode === 'edit' ? (
        <div style={{ minHeight }}>
          <textarea ref={textRef} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ width: '100%', border: 'none', borderRadius: 0, resize: 'vertical', fontFamily: 'inherit', minHeight }} />
        </div>
      ) : mode === 'preview' ? (
        <div style={{ padding: '0.75rem', minHeight, overflow: 'auto', background: '#0f172a' }}>
          <Preview content={value} />
        </div>
      ) : (
        <div style={{ display: 'flex', minHeight }}>
          <textarea ref={textRef} value={value} onChange={e => onChange(e.target.value)}
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
