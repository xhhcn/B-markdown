import React, { useMemo, useRef, useEffect, useCallback } from 'react'
import '../types/global'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

interface MarkdownPreviewProps {
  content: string
}

// 缓存处理器实例以提升性能
const markdownProcessor = unified()
  .use(remarkParse) // 解析Markdown
  .use(remarkGfm) // GitHub Flavored Markdown支持
  .use(remarkMath) // 数学公式解析支持
  .use(remarkRehype, { allowDangerousHtml: true }) // 转换为rehype
  .use(rehypeHighlight) // 代码语法高亮
  .use(rehypeKatex, {
    throwOnError: false,  // 不要因为错误而抛出异常
    errorColor: '#ff6666'  // 错误时的颜色
  }) // KaTeX数学公式渲染
  .use(rehypeStringify, { allowDangerousHtml: true }) // 输出HTML

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const previewRef = useRef<HTMLDivElement>(null)
  
  const htmlContent = useMemo(() => {
    try {
      const result = markdownProcessor.processSync(content)
      return String(result)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return `<p style="color: red;">Error rendering markdown: ${errorMessage}</p>`
    }
  }, [content])

  // 优化链接点击事件处理，避免频繁重绑定
  const handleLinkClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.tagName === 'A') {
      event.preventDefault()
      const href = target.getAttribute('href')
      if (href && href.startsWith('http')) {
        // 使用Electron API打开外部链接
        if (window.electronAPI?.openExternalLink) {
          window.electronAPI.openExternalLink(href)
        }
      }
    }
  }, [])

  // 只在组件挂载时绑定一次事件监听器
  useEffect(() => {
    const previewElement = previewRef.current
    if (previewElement) {
      previewElement.addEventListener('click', handleLinkClick)
      return () => {
        previewElement.removeEventListener('click', handleLinkClick)
      }
    }
  }, [handleLinkClick])

  return (
    <div 
      ref={previewRef}
      className="preview-content"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

export default MarkdownPreview 



