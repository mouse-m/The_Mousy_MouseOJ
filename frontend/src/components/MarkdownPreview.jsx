import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

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

export default function MarkdownPreview({ content }) {
  if (!content) return null
  const processed = content.replace(/@(\S+)/g, '[$&](/users/by-name/$1)')
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkEmoji]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            if (!inline && match) {
              if (match[1] === 'mermaid') {
                return <MermaidBlock code={String(children)} />
              }
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
