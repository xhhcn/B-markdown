import React, { useState, useEffect, useRef, useCallback } from 'react'
import { EditorView } from '@codemirror/view'

interface SearchOverlayProps {
  isVisible: boolean
  mode: 'find' | 'replace' | null
  onClose: () => void
  editorView?: EditorView
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ 
  isVisible, 
  mode, 
  onClose, 
  editorView 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [, setTotalMatches] = useState(0)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  // 搜索逻辑
  const findMatches = useCallback((term: string) => {
    if (!editorView || !term) {
      setTotalMatches(0)
      setCurrentMatchIndex(0)
      return []
    }

    const doc = editorView.state.doc
    const text = doc.toString()
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const matches: { from: number; to: number }[] = []
    
    let match
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        from: match.index,
        to: match.index + match[0].length
      })
    }
    
    setTotalMatches(matches.length)
    return matches
  }, [editorView])

  // 高亮匹配项
  const highlightMatches = useCallback((matches: { from: number; to: number }[]) => {
    if (!editorView || matches.length === 0) return

    // 这里可以添加高亮逻辑，目前先简化
    // 可以使用 CodeMirror 的 Decoration API 来高亮匹配项
  }, [editorView])

  // 跳转到下一个匹配项
  const goToNextMatch = useCallback(() => {
    if (!editorView || !searchTerm) return

    const matches = findMatches(searchTerm)
    if (matches.length === 0) return

    const nextIndex = (currentMatchIndex + 1) % matches.length
    const match = matches[nextIndex]
    
    editorView.dispatch({
      selection: { anchor: match.from, head: match.to },
      scrollIntoView: true
    })
    
    setCurrentMatchIndex(nextIndex)
    highlightMatches(matches)
  }, [searchTerm, currentMatchIndex, findMatches, highlightMatches, editorView])

  // 跳转到上一个匹配项
  const goToPrevMatch = useCallback(() => {
    if (!editorView || !searchTerm) return

    const matches = findMatches(searchTerm)
    if (matches.length === 0) return

    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1
    const match = matches[prevIndex]
    
    editorView.dispatch({
      selection: { anchor: match.from, head: match.to },
      scrollIntoView: true
    })
    
    setCurrentMatchIndex(prevIndex)
    highlightMatches(matches)
  }, [searchTerm, currentMatchIndex, findMatches, highlightMatches, editorView])

  // 替换当前匹配项
  const replaceCurrent = useCallback(() => {
    if (!editorView || !searchTerm || mode !== 'replace') return

    const matches = findMatches(searchTerm)
    if (matches.length === 0) return

    const match = matches[currentMatchIndex]
    editorView.dispatch({
      changes: { from: match.from, to: match.to, insert: replaceTerm }
    })

    // 查找下一个匹配项
    setTimeout(() => {
      const newMatches = findMatches(searchTerm)
      if (newMatches.length > 0) {
        const nextIndex = Math.min(currentMatchIndex, newMatches.length - 1)
        const nextMatch = newMatches[nextIndex]
        editorView.dispatch({
          selection: { anchor: nextMatch.from, head: nextMatch.to },
          scrollIntoView: true
        })
        setCurrentMatchIndex(nextIndex)
      }
    }, 10)
  }, [searchTerm, replaceTerm, currentMatchIndex, mode, findMatches, editorView])

  // 替换全部
  const replaceAll = useCallback(() => {
    if (!editorView || !searchTerm || mode !== 'replace') return

    const matches = findMatches(searchTerm)
    if (matches.length === 0) return

    // 从后往前替换，避免位置偏移
    const changes = matches.reverse().map(match => ({
      from: match.from,
      to: match.to,
      insert: replaceTerm
    }))

    editorView.dispatch({ changes })
    setTotalMatches(0)
    setCurrentMatchIndex(0)
  }, [searchTerm, replaceTerm, mode, findMatches, editorView])

  // 键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'Enter':
        if (e.shiftKey) {
          goToPrevMatch()
        } else if (e.metaKey || e.ctrlKey) {
          if (mode === 'replace') {
            if (e.altKey) {
              replaceAll()
            } else {
              replaceCurrent()
            }
          }
        } else {
          goToNextMatch()
        }
        e.preventDefault()
        break
      case 'F3':
        if (e.shiftKey) {
          goToPrevMatch()
        } else {
          goToNextMatch()
        }
        e.preventDefault()
        break
    }
  }, [onClose, goToNextMatch, goToPrevMatch, replaceCurrent, replaceAll, mode])

  // 搜索词变化时更新匹配
  useEffect(() => {
    if (searchTerm) {
      const matches = findMatches(searchTerm)
      if (matches.length > 0) {
        setCurrentMatchIndex(0)
        const firstMatch = matches[0]
        if (editorView) {
          editorView.dispatch({
            selection: { anchor: firstMatch.from, head: firstMatch.to },
            scrollIntoView: true
          })
        }
        highlightMatches(matches)
      }
    } else {
      setTotalMatches(0)
      setCurrentMatchIndex(0)
    }
  }, [searchTerm, findMatches, highlightMatches, editorView])

  // 聚焦处理
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }, 100)
    }
  }, [isVisible])

  // 清理
  useEffect(() => {
    if (!isVisible) {
      setSearchTerm('')
      setReplaceTerm('')
      setCurrentMatchIndex(0)
      setTotalMatches(0)
    }
  }, [isVisible])

  if (!isVisible || !mode) return null

  return (
    <div className="search-overlay">
      <div className="search-inputs">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="查找..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="search-input"
        />
        
        {mode === 'replace' && (
          <input
            ref={replaceInputRef}
            type="text"
            placeholder="替换为..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-input"
          />
        )}
      </div>
    </div>
  )
}

export default SearchOverlay