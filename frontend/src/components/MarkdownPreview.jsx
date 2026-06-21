import { useEffect, useRef } from 'react'
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

export default function MarkdownPreview({ content }) {
  if (!content) return null
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
