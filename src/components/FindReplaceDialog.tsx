import React, { useState, useRef, useEffect } from 'react'
import { EditorView } from '@codemirror/view'

interface FindReplaceDialogProps {
  isOpen: boolean
  onClose: () => void
  editorView: EditorView | null
  mode: 'find' | 'replace'
}

const FindReplaceDialog: React.FC<FindReplaceDialogProps> = ({
  isOpen,
  onClose,
  editorView,
  mode
}) => {
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [currentMatch, setCurrentMatch] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  
  // 当对话框打开时自动聚焦搜索框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.select()
    }
  }, [isOpen])
  
  // 搜索匹配项
  const findMatches = (text: string) => {
    if (!editorView || !text) {
      setTotalMatches(0)
      setCurrentMatch(0)
      return []
    }
    
    const doc = editorView.state.doc
    const content = doc.toString()
    const matches: { from: number; to: number }[] = []
    
    try {
      let regex: RegExp
      if (useRegex) {
        regex = new RegExp(text, caseSensitive ? 'g' : 'gi')
      } else {
        // 转义特殊字符
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = wholeWord ? `\\b${escapedText}\\b` : escapedText
        regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi')
      }
      
      let match
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length
        })
        
        // 防止无限循环
        if (match[0].length === 0) break
      }
    } catch (error) {
      console.error('Search regex error:', error)
    }
    
    setTotalMatches(matches.length)
    return matches
  }
  
  // 高亮匹配项
  const highlightMatches = (_matches: { from: number; to: number }[]) => {
    if (!editorView) return
    
    // 清除之前的高亮
    editorView.dispatch({
      effects: []
    })
    
    // 这里应该使用CodeMirror的装饰器来高亮，但为了简化，我们先跳过
    // 实际实现中需要使用 Decoration.mark() 等
  }
  
  // 跳转到下一个匹配项
  const findNext = () => {
    const matches = findMatches(searchText)
    if (matches.length === 0) return
    
    const nextIndex = (currentMatch % matches.length)
    const match = matches[nextIndex]
    
    if (editorView && match) {
      editorView.dispatch({
        selection: { anchor: match.from, head: match.to },
        effects: EditorView.scrollIntoView(match.from)
      })
      setCurrentMatch(nextIndex + 1)
    }
  }
  
  // 跳转到上一个匹配项
  const findPrev = () => {
    const matches = findMatches(searchText)
    if (matches.length === 0) return
    
    const prevIndex = currentMatch <= 1 ? matches.length - 1 : currentMatch - 2
    const match = matches[prevIndex]
    
    if (editorView && match) {
      editorView.dispatch({
        selection: { anchor: match.from, head: match.to },
        effects: EditorView.scrollIntoView(match.from)
      })
      setCurrentMatch(prevIndex + 1)
    }
  }
  
  // 替换当前匹配项
  const replaceCurrent = () => {
    if (!editorView || mode !== 'replace') return
    
    const matches = findMatches(searchText)
    if (matches.length === 0 || currentMatch === 0) return
    
    const match = matches[currentMatch - 1]
    if (match) {
      editorView.dispatch({
        changes: { from: match.from, to: match.to, insert: replaceText }
      })
      
      // 查找下一个
      setTimeout(() => findNext(), 50)
    }
  }
  
  // 替换所有匹配项
  const replaceAll = () => {
    if (!editorView || mode !== 'replace') return
    
    const matches = findMatches(searchText)
    if (matches.length === 0) return
    
    // 从后往前替换，避免位置偏移
    const changes = matches.reverse().map(match => ({
      from: match.from,
      to: match.to,
      insert: replaceText
    }))
    
    editorView.dispatch({ changes })
    setCurrentMatch(0)
    setTotalMatches(0)
  }
  
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        findPrev()
      } else {
        findNext()
      }
    } else if (e.key === 'F3') {
      e.preventDefault()
      if (e.shiftKey) {
        findPrev()
      } else {
        findNext()
      }
    }
  }
  
  // 当搜索文本改变时自动查找
  useEffect(() => {
    if (searchText) {
      const matches = findMatches(searchText)
      highlightMatches(matches)
      if (matches.length > 0) {
        setCurrentMatch(1)
        const match = matches[0]
        if (editorView && match) {
          editorView.dispatch({
            selection: { anchor: match.from, head: match.to },
            effects: EditorView.scrollIntoView(match.from)
          })
        }
      } else {
        setCurrentMatch(0)
      }
    } else {
      setCurrentMatch(0)
      setTotalMatches(0)
    }
  }, [searchText, caseSensitive, wholeWord, useRegex])
  
  if (!isOpen) return null
  
  return (
    <div className="find-replace-overlay" onClick={onClose}>
      <div 
        className="find-replace-dialog" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="find-replace-header">
          <h3>{mode === 'find' ? '查找' : '查找和替换'}</h3>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        
        <div className="find-replace-content">
          {/* 搜索输入框 */}
          <div className="input-group">
            <label htmlFor="search-input">查找：</label>
            <div className="input-with-controls">
              <input
                id="search-input"
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="输入搜索内容..."
                className="search-input"
              />
              <div className="search-controls">
                <button
                  className={`control-button ${caseSensitive ? 'active' : ''}`}
                  onClick={() => setCaseSensitive(!caseSensitive)}
                  title="区分大小写"
                >
                  Aa
                </button>
                <button
                  className={`control-button ${wholeWord ? 'active' : ''}`}
                  onClick={() => setWholeWord(!wholeWord)}
                  title="全词匹配"
                >
                  Ab
                </button>
                <button
                  className={`control-button ${useRegex ? 'active' : ''}`}
                  onClick={() => setUseRegex(!useRegex)}
                  title="使用正则表达式"
                >
                  .*
                </button>
              </div>
            </div>
          </div>
          
          {/* 替换输入框 */}
          {mode === 'replace' && (
            <div className="input-group">
              <label htmlFor="replace-input">替换为：</label>
              <input
                id="replace-input"
                ref={replaceInputRef}
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="输入替换内容..."
                className="replace-input"
              />
            </div>
          )}
          
          {/* 搜索结果信息 */}
          <div className="search-info">
            {totalMatches > 0 ? (
              <span>{currentMatch} / {totalMatches} 匹配项</span>
            ) : searchText ? (
              <span>未找到匹配项</span>
            ) : (
              <span>输入搜索内容</span>
            )}
          </div>
          
          {/* 操作按钮 */}
          <div className="action-buttons">
            <div className="navigation-buttons">
              <button 
                className="nav-button"
                onClick={findPrev}
                disabled={totalMatches === 0}
                title="上一个 (Shift+Enter)"
              >
                ↑
              </button>
              <button 
                className="nav-button"
                onClick={findNext}
                disabled={totalMatches === 0}
                title="下一个 (Enter)"
              >
                ↓
              </button>
            </div>
            
            {mode === 'replace' && (
              <div className="replace-buttons">
                <button 
                  className="replace-button"
                  onClick={replaceCurrent}
                  disabled={totalMatches === 0 || currentMatch === 0}
                >
                  替换
                </button>
                <button 
                  className="replace-all-button"
                  onClick={replaceAll}
                  disabled={totalMatches === 0}
                >
                  全部替换
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="find-replace-footer">
          <small>按 Esc 关闭 | Enter 下一个 | Shift+Enter 上一个</small>
        </div>
      </div>
    </div>
  )
}

export default FindReplaceDialog