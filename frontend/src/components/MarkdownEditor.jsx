import { useEffect, useRef, useState, useCallback } from 'react'
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

function CodeBlock({ node, children }) {
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
  bilibili: '![bilibili](BV)',
  info: ':::info[信息]\n内容\n:::',
  success: ':::success[成功]\n内容\n:::',
  warning: ':::warning[警告]\n内容\n:::',
  error: ':::error[错误]\n内容\n:::',
  'align-center': ':::align{center}\n内容\n:::',
  'align-right': ':::align{right}\n内容\n:::',
  epigraph: ':::epigraph[来源]\n引言内容\n:::',
  'cute-table': '::cute-table{tuack}\n| 列1 | 列2 |\n| :-: | :-: |\n| 内容 | 内容 |\n:::',
  'table-merge': '| 标题1 | 标题2 | 标题3 |\n| :-: | :-: | :-: |\n| A | B | C |\n| ^ | D | E |\n| 跨列 | < | F |',
}

const latexCommands = [
  { cmd: '\\frac{}{}', desc: '分数' },
  { cmd: '\\sqrt{}', desc: '平方根' },
  { cmd: '\\sqrt[]{}', desc: 'n次方根' },
  { cmd: '\\sum_{}^{}', desc: '求和' },
  { cmd: '\\int_{}^{}', desc: '定积分' },
  { cmd: '\\iint_{}^{}', desc: '二重积分' },
  { cmd: '\\prod_{}^{}', desc: '连乘' },
  { cmd: '\\lim_{}', desc: '极限' },
  { cmd: '\\infty', desc: '无穷' },
  { cmd: '\\alpha', desc: 'α' },
  { cmd: '\\beta', desc: 'β' },
  { cmd: '\\gamma', desc: 'γ' },
  { cmd: '\\theta', desc: 'θ' },
  { cmd: '\\pi', desc: 'π' },
  { cmd: '\\omega', desc: 'ω' },
  { cmd: '\\Delta', desc: 'Δ' },
  { cmd: '\\rightarrow', desc: '→' },
  { cmd: '\\Rightarrow', desc: '⇒' },
  { cmd: '\\leftarrow', desc: '←' },
  { cmd: '\\Leftarrow', desc: '⇐' },
  { cmd: '\\times', desc: '×' },
  { cmd: '\\cdot', desc: '·' },
  { cmd: '\\approx', desc: '≈' },
  { cmd: '\\neq', desc: '≠' },
  { cmd: '\\leq', desc: '≤' },
  { cmd: '\\geq', desc: '≥' },
  { cmd: '\\subset', desc: '⊂' },
  { cmd: '\\subseteq', desc: '⊆' },
  { cmd: '\\cup', desc: '∪' },
  { cmd: '\\cap', desc: '∩' },
  { cmd: '\\in', desc: '∈' },
  { cmd: '\\notin', desc: '∉' },
  { cmd: '\\binom{}{}', desc: '二项式系数' },
  { cmd: '\\text{}', desc: '文本模式' },
  { cmd: '\\quad', desc: '空格' },
  { cmd: '\\dots', desc: '…' },
  { cmd: '\\cdots', desc: '⋯' },
  { cmd: '\\underline{}', desc: '下划线' },
  { cmd: '\\overline{}', desc: '上划线' },
  { cmd: '\\vec{}', desc: '向量' },
  { cmd: '\\bar{}', desc: '均值/重音' },
  { cmd: '\\widehat{}', desc: '宽帽' },
  { cmd: '\\tilde{}', desc: '波浪号' },
  { cmd: '\\partial', desc: '偏微分' },
  { cmd: '\\nabla', desc: '梯度/纳布拉' },
  { cmd: '\\angle', desc: '角' },
  { cmd: '\\triangle', desc: '三角形' },
  { cmd: '\\therefore', desc: '∴' },
  { cmd: '\\because', desc: '∵' },
  { cmd: '\\forall', desc: '∀' },
  { cmd: '\\exists', desc: '∃' },
  { cmd: '\\mathbb{}', desc: '黑板粗体' },
  { cmd: '\\mathcal{}', desc: '花体' },
  { cmd: '\\mathrm{}', desc: '罗马体' },
  { cmd: '\\mathbf{}', desc: '粗体' },
  { cmd: '\\begin{cases}', desc: '分段函数' },
]

const directiveCompletions = [
  { label: 'info[信息]', insert: ':::info[信息]\n\n:::' },
  { label: 'success[成功]', insert: ':::success[成功]\n\n:::' },
  { label: 'warning[警告]', insert: ':::warning[警告]\n\n:::' },
  { label: 'error[错误]', insert: ':::error[错误]\n\n:::' },
  { label: 'align{center}', insert: ':::align{center}\n\n:::' },
  { label: 'align{right}', insert: ':::align{right}\n\n:::' },
  { label: 'epigraph[来源]', insert: ':::epigraph[来源]\n\n:::' },
]

export default function MarkdownEditor({ value, onChange, minHeight = 200, placeholder = '' }) {
  const [mode, setMode] = useState('split')
  const [acOpen, setAcOpen] = useState(false)
  const [acType, setAcType] = useState(null)
  const [acFilter, setAcFilter] = useState('')
  const [acIdx, setAcIdx] = useState(0)
  const [showLatex, setShowLatex] = useState(false)
  const textRef = useRef(null)
  const acRef = useRef(null)

  const insert = useCallback((text) => {
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
  }, [value, onChange])

  const insertSnippet = useCallback((key) => {
    const text = snippets[key]
    if (text) insert(text)
  }, [insert])

  const handleInput = useCallback((e) => {
    const ta = textRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const before = value.substring(0, pos)
    const lastColon = before.lastIndexOf(':')
    const lastBackslash = before.lastIndexOf('\\')
    const lastNewline = Math.max(before.lastIndexOf('\n'), before.lastIndexOf(' '))

    if (lastColon > lastNewline) {
      const prefix = before.substring(lastColon)
      if (prefix === ':' || prefix === '::' || prefix === ':::') {
        setAcType('directive')
        setAcFilter('')
        setAcIdx(0)
        setAcOpen(true)
        return
      }
    }

    if (lastBackslash > lastNewline && before[lastBackslash - 1] !== '\\') {
      const prefix = before.substring(lastBackslash + 1)
      setAcType('latex')
      setAcFilter(prefix)
      setAcIdx(0)
      setAcOpen(true)
      return
    }

    setAcOpen(false)
  }, [value])

  const handleKeyDown = useCallback((e) => {
    if (!acOpen) return
    const items = acType === 'directive' ? directiveCompletions : latexCommands
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAcIdx(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAcIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const item = items[acIdx]
      if (item) {
        const insertText = item.insert || item.cmd
        const ta = textRef.current
        if (ta) {
          const pos = ta.selectionStart
          const before = value.substring(0, pos)
          const trigger = acType === 'directive' ? before.lastIndexOf(':') : before.lastIndexOf('\\')
          if (trigger >= 0) {
            const newVal = before.substring(0, trigger) + insertText + value.substring(pos)
            onChange(newVal)
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = trigger + insertText.length
              ta.focus()
            })
          }
        }
      }
      setAcOpen(false)
    } else if (e.key === 'Escape') {
      setAcOpen(false)
    }
  }, [acOpen, acType, acIdx, value, onChange])

  const toolBtn = (label, title, snippetKey) => (
    <button key={snippetKey} type="button" title={title} onClick={() => insertSnippet(snippetKey)}
      style={{
        padding: '0.25rem 0.5rem', border: '1px solid #334155', borderRadius: 4, background: '#1e293b',
        color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap'
      }}>{label}</button>
  )

  const acItems = acType === 'directive' ? directiveCompletions
    : acType === 'latex' ? latexCommands.filter(c => c.cmd.includes(acFilter)) : []

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
        <button type="button" title="LaTeX 命令参考" onClick={() => setShowLatex(s => !s)}
          style={{
            padding: '0.25rem 0.5rem', border: '1px solid #334155', borderRadius: 4, background: showLatex ? '#1e3a5f' : '#1e293b',
            color: showLatex ? '#93c5fd' : '#94a3b8', cursor: 'pointer', fontSize: '0.78rem'
          }}>Σ LaTeX</button>
      </div>
      <div style={{ position: 'relative', minHeight }}>
        {(mode === 'edit' || mode === 'split') && (
          <>
            <textarea ref={textRef} value={value}
              onChange={e => { onChange(e.target.value); setAcOpen(false) }}
              onInput={handleInput} onKeyDown={handleKeyDown}
              placeholder={placeholder}
              style={{
                width: mode === 'split' ? '50%' : '100%', border: 'none', borderRadius: 0,
                resize: 'vertical', fontFamily: 'inherit', minHeight,
                display: mode === 'edit' ? 'block' : 'inline-block', verticalAlign: 'top'
              }} />
            {acOpen && acItems.length > 0 && (
              <div ref={acRef} style={{
                position: 'absolute', left: 0, top: 0, zIndex: 100,
                background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                maxHeight: 240, overflowY: 'auto', minWidth: 200,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
              }}>
                {acItems.map((item, i) => (
                  <div key={i} onClick={() => {
                    const text = item.insert || item.cmd
                    const ta = textRef.current
                    if (ta) {
                      const pos = ta.selectionStart
                      const before = value.substring(0, pos)
                      const trigger = acType === 'directive' ? before.lastIndexOf(':') : before.lastIndexOf('\\')
                      if (trigger >= 0) {
                        onChange(before.substring(0, trigger) + text + value.substring(pos))
                        requestAnimationFrame(() => {
                          ta.selectionStart = ta.selectionEnd = trigger + text.length
                          ta.focus()
                        })
                      }
                    }
                    setAcOpen(false)
                  }}
                    style={{
                      padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem',
                      background: i === acIdx ? '#334155' : 'transparent',
                      color: i === acIdx ? '#e2e8f0' : '#94a3b8'
                    }}>
                    <code style={{ color: '#38bdf8' }}>{item.label || item.cmd}</code>
                    {item.desc && <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.75rem' }}>{item.desc}</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {mode === 'preview' || mode === 'split' ? (
          mode === 'split' ? (
            <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', padding: '0.75rem', overflow: 'auto', background: '#0f172a', borderLeft: '1px solid #334155' }}>
              <Preview content={value} />
            </div>
          ) : (
            <div style={{ padding: '0.75rem', minHeight, overflow: 'auto', background: '#0f172a' }}>
              <Preview content={value} />
            </div>
          )
        ) : null}
      </div>

      {showLatex && (
        <div style={{ borderTop: '1px solid #334155', background: '#0f172a', maxHeight: 300, overflowY: 'auto', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#93c5fd', fontWeight: 600, fontSize: '0.9rem' }}>LaTeX 常用命令</span>
            <button type="button" onClick={() => setShowLatex(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>关闭</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.25rem' }}>
            {latexCommands.map((c, i) => (
              <div key={i} onClick={() => insert(c.cmd)}
                style={{
                  padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem',
                  color: '#94a3b8', display: 'flex', gap: '0.5rem', alignItems: 'center'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <code style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{c.cmd}</code>
                <span style={{ color: '#64748b' }}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
