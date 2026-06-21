import { visit } from 'unist-util-visit'

function getTextContent(node) {
  if (!node) return ''
  if (node.type === 'text') return node.value || ''
  if (node.children) return node.children.map(getTextContent).join('')
  return ''
}

export function rehypeTableMerge() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'table') return
      const rows = []
      function collect(el) {
        if (!el.children) return
        for (const c of el.children) {
          if (c.tagName === 'tr') rows.push(c)
          else if (c.tagName === 'thead' || c.tagName === 'tbody') collect(c)
        }
      }
      collect(node)

      for (let ri = rows.length - 1; ri >= 1; ri--) {
        const row = rows[ri]
        const cells = []
        for (let ci = 0; ci < row.children.length; ci++) {
          if (row.children[ci].tagName === 'td' || row.children[ci].tagName === 'th') {
            cells.push({ idx: ci, el: row.children[ci] })
          }
        }
        for (let ci = cells.length - 1; ci >= 0; ci--) {
          const cell = cells[ci]
          const text = getTextContent(cell.el).trim()
          if (text === '^') {
            const aboveRow = rows[ri - 1]
            let cnt = -1
            for (let ai = 0; ai < aboveRow.children.length; ai++) {
              if (aboveRow.children[ai].tagName === 'td' || aboveRow.children[ai].tagName === 'th') {
                cnt++
                if (cnt === ci) {
                  const above = aboveRow.children[ai]
                  above.properties = above.properties || {}
                  above.properties.rowspan = (parseInt(above.properties.rowspan || '1')) + 1
                  row.children.splice(cell.idx, 1)
                  break
                }
              }
            }
          } else if (text === '<') {
            if (ci > 0) {
              const left = cells[ci - 1].el
              const leftText = getTextContent(left).trim()
              if (leftText !== '^' && leftText !== '<') {
                left.properties = left.properties || {}
                left.properties.colspan = (parseInt(left.properties.colspan || '1')) + 1
                row.children.splice(cell.idx, 1)
              }
            }
          }
        }
      }
    })
  }
}

export function remarkDirectiveHandler() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective' && node.type !== 'leafDirective') return
      const data = node.data || (node.data = {})
      const attrs = node.attributes || {}

      if (node.name === 'align') {
        const align = Object.keys(attrs)[0] || 'center'
        data.hName = 'div'
        data.hProperties = { className: `align-${align}` }
      } else if (node.name === 'epigraph') {
        data.hName = 'blockquote'
        data.hProperties = { className: 'epigraph' }
        if (node.label) {
          const cite = {
            type: 'paragraph',
            data: { hName: 'div', hProperties: { className: 'epigraph-cite' } },
            children: [{ type: 'text', value: '\u2014\u2014 ' + node.label }]
          }
          node.children = [...(node.children || []), cite]
        }
      } else if (['info', 'success', 'warning', 'error'].includes(node.name)) {
        data.hName = 'details'
        data.hProperties = { className: `callout callout-${node.name}` }
        if ('open' in attrs) data.hProperties.open = true
        if (node.label) {
          const summary = {
            type: 'paragraph',
            data: { hName: 'summary', hProperties: { className: 'callout-summary' } },
            children: [{ type: 'text', value: node.label }]
          }
          node.children = [summary, ...(node.children || [])]
        }
      } else if (node.name === 'cute-table') {
        data.hName = 'div'
        data.hProperties = { className: 'cute-table' }
      }
    })
  }
}

export function preprocessContent(content) {
  if (!content) return content
  let result = content
  result = result.replace(
    /!\[bilibili\]\(BV([A-Za-z0-9_]+)\)/g,
    (_, bvid) => `<div class="bilibili-embed"><iframe src="https://player.bilibili.com/player.html?bvid=BV${bvid}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe></div>`
  )
  result = result.replace(
    /!\[bilibili\]\(https?:\/\/(?:www\.)?bilibili\.com\/video\/([A-Za-z0-9_]+)\)/g,
    (_, bvid) => `<div class="bilibili-embed"><iframe src="https://player.bilibili.com/player.html?bvid=${bvid}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe></div>`
  )
  return result
}
