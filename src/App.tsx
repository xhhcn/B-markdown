import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown as markdownLang } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import MarkdownPreview from './components/MarkdownPreview'
import WelcomeScreen from './components/WelcomeScreen'
import SearchOverlay from './components/SearchOverlay'
import ProgressDialog from './components/ProgressDialog'
import { SiMarkdown } from 'react-icons/si'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'


const initialMarkdown = ''
// 透明主题扩展 - 强制滚动
const transparentTheme = EditorView.theme({
  '&': {
    background: 'transparent !important',
    color: 'inherit',
    height: '100%',
    overflow: 'hidden', /* 防止编辑器溢出 */
    width: '100%', /* 确保宽度受限 */
  },
  '.cm-content': {
    background: 'transparent !important',
    padding: '8px 0',
    minHeight: 'auto',
  },
  '.cm-scroller': {
    background: 'transparent !important',
    height: '100%',
    maxHeight: '100%',
    overflowY: 'overlay',
    overflowX: 'auto', /* 只在内容超出时显示横向滚动 */
    scrollBehavior: 'smooth',
    width: '100%', /* 确保scroller宽度受限 */
  },
  '.cm-focused': {
    background: 'transparent !important',
    outline: 'none !important',
  },
  '.cm-editor': {
    background: 'transparent !important',
    height: '100%',
    overflow: 'hidden', /* 防止编辑器本身溢出 */
    width: '100%', /* 确保编辑器宽度受限 */
  },
  '.cm-line': {
    background: 'transparent !important',
  },
  // 确保行号跟随内容滚动而不固定，完全自适应宽度
  '.cm-gutters': {
    position: 'static !important', /* 不使用固定定位 */
    zIndex: '1 !important', /* 降低层级 */
    minWidth: 'unset !important', /* 移除固定最小宽度 */
    padding: '0 !important', /* 移除内边距 */
  },
  // 行号元素样式 - 确保宽度自适应
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 4px !important', /* 左4px，右8px对齐 */
    textAlign: 'right !important', /* 右对齐 */
    minWidth: 'unset !important', /* 移除固定最小宽度 */
    display: 'block !important', /* block显示 */
    width: '100% !important', /* 占满容器宽度 */
  },
  // 当前行高亮样式 - 确保背景连贯
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.025) !important',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.035) !important',
    width: '100% !important', /* 确保背景覆盖整个行号列宽度 */
  },
  // 行号列背景
  '.cm-lineNumbers': {
    backgroundColor: 'transparent !important',
    width: '100% !important',
  }
})

function App() {
  const [markdownContent, setMarkdownContent] = useState(initialMarkdown)
  const [debouncedContent, setDebouncedContent] = useState(initialMarkdown)
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  

  const [editorWidth, setEditorWidth] = useState(50) // 编辑器宽度百分比
  const [showWelcome, setShowWelcome] = useState(true) // 是否显示欢迎界面
  const [showPreview, setShowPreview] = useState(true) // 是否显示预览面板
  const [searchMode, setSearchMode] = useState<'find' | 'replace' | null>(null) // 搜索模式
  
  // PDF导出进度状态
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportMessage, setExportMessage] = useState('')
  


  // 同步未保存状态到全局变量，供主进程访问
  useEffect(() => {
    window.__hasUnsavedChanges = hasUnsavedChanges
  }, [hasUnsavedChanges])
  const [editorKey, setEditorKey] = useState(0) // 用于强制重新渲染编辑器
  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const editorViewRef = useRef<EditorView | null>(null)

  // 动态gutter宽度计算 - 减少频繁更新
  useEffect(() => {
    const updateGutterWidth = () => {
      if (editorRef.current) {
        const gutters = editorRef.current.querySelector('.cm-gutters') as HTMLElement
        if (gutters) {
          const actualWidth = gutters.offsetWidth
          document.documentElement.style.setProperty('--gutter-width', `${actualWidth}px`)
        }
      }
    }
    const timer = setTimeout(updateGutterWidth, 200)
    return () => {
      clearTimeout(timer)
    }
  }, [editorKey]) // 只在编辑器重新创建时更新

  // 文件操作函数


    

  // handleSaveFile逻辑已经内联到菜单事件处理器中

  // handleSaveAsFile逻辑已经内联到菜单事件处理器中

  // 防抖处理，延迟更新预览内容
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(markdownContent)
    }, 150) // 150ms 防抖延迟

    return () => clearTimeout(timer)
  }, [markdownContent])

  // 监听文件内容变化 - 使用useCallback优化
  const handleContentChange = useCallback((value: string) => {
    setMarkdownContent(value)
    setHasUnsavedChanges(true)
  }, [])

  // 清除编辑器历史记录 - 使用useCallback优化
  const clearEditorHistory = useCallback(() => {
    // 通过改变key来强制重新渲染CodeMirror组件，这会清除所有历史记录
    setEditorKey(prev => prev + 1)
  }, [])



  // 新文件
  const handleNewFile = useCallback(async () => {
    // 使用ref来获取最新的状态
    if (hasUnsavedChangesRef.current && window.electronAPI) {
      try {
        const choice = await window.electronAPI.showUnsavedChangesDialog('新建文件')
        
        if (choice === 0) {
          // 用户选择保存
          const currentPath = currentFilePathRef.current
          const content = markdownContentRef.current
          
          const result = await window.electronAPI.saveFile(content, currentPath || undefined)
          if (result) {
            if (typeof result === 'string') {
              setCurrentFilePath(result)
            }
            setHasUnsavedChanges(false)
          } else {
            return // 保存失败，取消操作
          }
        } else if (choice === 1) {
          // 用户选择不保存，继续
        } else {
          // 用户取消操作 (choice === 2)
          return
        }
      } catch (error) {
        console.error('Error showing unsaved changes dialog:', error)
        return
      }
    }

    setMarkdownContent('')
    setDebouncedContent('')
    setCurrentFilePath(null)
    setHasUnsavedChanges(false)
    setShowWelcome(false)
    setTimeout(() => clearEditorHistory(), 100)
  }, [])

  // 打开文件
  const handleOpenFile = useCallback(async () => {
    // 使用ref来获取最新的状态
    if (hasUnsavedChangesRef.current && window.electronAPI) {
      try {
        const choice = await window.electronAPI.showUnsavedChangesDialog('打开文件')
        
        if (choice === 0) {
          // 用户选择保存
          const currentPath = currentFilePathRef.current
          const content = markdownContentRef.current
          
          const result = await window.electronAPI.saveFile(content, currentPath || undefined)
          if (result) {
            if (typeof result === 'string') {
              setCurrentFilePath(result)
            }
            setHasUnsavedChanges(false)
          } else {
            return // 保存失败，取消操作
          }
        } else if (choice === 1) {
          // 用户选择不保存，继续
        } else {
          // 用户取消操作 (choice === 2)
          return
        }
      } catch (error) {
        console.error('Error showing unsaved changes dialog:', error)
        return
      }
    }

    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.openFile()
        if (result) {
          setMarkdownContent(result.content)
          setDebouncedContent(result.content)
          setCurrentFilePath(result.filePath)
          setHasUnsavedChanges(false)
          setShowWelcome(false)
          setTimeout(() => clearEditorHistory(), 100)
        }
      } catch (error) {
        console.error('Error opening file:', error)
      }
    }
  }, [])

  // 使用useRef来避免闭包陷阱
  const currentFilePathRef = useRef<string | null>(null)
  const markdownContentRef = useRef<string>('')
  const hasUnsavedChangesRef = useRef<boolean>(false)

  // 处理拖拽调整宽度 - 使用useCallback优化
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.classList.add('resizing')
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    
    // 限制宽度在20%到80%之间
    const clampedWidth = Math.min(Math.max(newWidth, 20), 80)
    setEditorWidth(clampedWidth)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (isResizing.current) {

    }
    isResizing.current = false
    document.body.style.cursor = ''
    document.body.classList.remove('resizing')
  }, [editorWidth])

  // 重置为50:50布局 - 使用useCallback优化
  const resetLayout = useCallback(() => {

    setEditorWidth(50)
  }, [])

  // 切换预览面板显示/隐藏
  const togglePreview = useCallback(() => {

    setShowPreview(prev => !prev)
  }, [showPreview])

  // 打开搜索功能
  const openFind = useCallback(() => {

    setSearchMode('find')
  }, [])

  // 打开替换功能
  const openReplace = useCallback(() => {

    setSearchMode('replace')
  }, [])

  // 关闭搜索功能
  const closeSearch = useCallback(() => {

    setSearchMode(null)
  }, [])

  // 测试函数已移除

  // 添加全局鼠标事件监听和键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + 0 重置布局
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        resetLayout()
      }
      
      // Cmd/Ctrl + Shift + H 切换预览
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        togglePreview()
      }
      
      // Cmd/Ctrl + F 查找
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        openFind()
      }
      
      // Cmd/Ctrl + H 替换（没有Shift）
      if ((e.metaKey || e.ctrlKey) && e.key === 'h' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        openReplace()
      }
      
      // Escape 关闭搜索
      if (e.key === 'Escape' && searchMode) {
        e.preventDefault()
        closeSearch()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleMouseMove, handleMouseUp, togglePreview, openFind, openReplace, closeSearch, searchMode])

  // 同步refs
  useEffect(() => {
    currentFilePathRef.current = currentFilePath
    markdownContentRef.current = markdownContent
    hasUnsavedChangesRef.current = hasUnsavedChanges
  }, [currentFilePath, markdownContent, hasUnsavedChanges])

  // 监听文件打开事件和菜单命令 - 只设置一次
  useEffect(() => {
    if (window.electronAPI) {
      // 监听文件打开
      const handleFileOpened = (content: string, filePath: string) => {
        setMarkdownContent(content)
        setDebouncedContent(content)
        setCurrentFilePath(filePath)
        setHasUnsavedChanges(false)
        setShowWelcome(false)
        // 清除编辑历史，防止撤销到之前的文件
        setTimeout(() => clearEditorHistory(), 100)
      }
      
      window.electronAPI.onFileOpened(handleFileOpened)

      // 监听菜单保存命令 - 使用ref来获取最新值
      const handleMenuSave = async () => {
        const currentPath = currentFilePathRef.current
        const content = markdownContentRef.current

        
        if (window.electronAPI) {
          try {

            const result = await window.electronAPI.saveFile(content, currentPath || undefined)

            if (result) {
              if (typeof result === 'string') {
                // 新文件保存，返回文件路径

                setCurrentFilePath(result)
              }
              setHasUnsavedChanges(false)

            }
          } catch (error) {
            console.error('Error saving file:', error)
          }
        }
      }
      
      const handleMenuSaveAs = async () => {
        const currentPath = currentFilePathRef.current
        const content = markdownContentRef.current

        
        if (window.electronAPI) {
          try {

            const result = await window.electronAPI.saveAsFile(content, currentPath || undefined)

            if (result.success && result.filePath) {
              setCurrentFilePath(result.filePath)
              setHasUnsavedChanges(false)

            }
          } catch (error) {
            console.error('Error saving as file:', error)
          }
        }
      }



      // 重置布局
      const handleResetLayout = () => {

        resetLayout()
      }

      // 切换预览面板
      const handleTogglePreview = () => {

        togglePreview()
      }

      // 菜单查找
      const handleMenuFind = () => {

        openFind()
      }

      // 菜单替换
      const handleMenuReplace = () => {

        openReplace()
      }

      // 关于对话框
      const handleAbout = () => {
        alert(`Markdown Editor v1.0.0\n\n基于 Electron + React + CodeMirror 构建的现代化Markdown编辑器\n\n功能特性：\n• 实时预览\n• 文件操作\n• 可拖拽分隔线\n• 毛玻璃界面`)
      }

      // 快捷键说明
      const handleShortcuts = () => {
        alert(`快捷键说明：\n\n文件操作：\nCmd/Ctrl+N - 新建文件\nCmd/Ctrl+O - 打开文件\nCmd/Ctrl+S - 保存文件\nCmd/Ctrl+Shift+S - 另存为\nCmd/Ctrl+E - 导出PDF\n\n编辑操作：\nCmd/Ctrl+Z - 撤销\nCmd/Ctrl+Y - 重做\nCmd/Ctrl+F - 查找\nCmd/Ctrl+H - 替换\n\n视图操作：\nCmd/Ctrl+Shift+H - 切换预览\nCmd/Ctrl+0 - 重置布局\nF11 - 全屏切换\n\n其他：\n双击分隔线 - 重置布局`)
      }

      // 处理关闭前保存
      const handleSaveBeforeClose = async () => {
        const currentPath = currentFilePathRef.current
        const content = markdownContentRef.current

        
        if (window.electronAPI) {
          try {
            const result = await window.electronAPI.saveFile(content, currentPath || undefined)
            if (result) {
              if (typeof result === 'string') {
                setCurrentFilePath(result)
              }
              setHasUnsavedChanges(false)

             // 保存成功后关闭应用
             window.__hasUnsavedChanges = false

             // 通知主进程保存已完成，可以安全关闭
             if (window.electronAPI && window.electronAPI.notifySaveCompleted) {
               window.electronAPI.notifySaveCompleted()
             }
            }
          } catch (error) {
            console.error('Error saving file before close:', error)
          }
        }
      }

      // 处理PDF导出
      const handleExportPDF = async () => {
        const content = markdownContentRef.current
        const currentPath = currentFilePathRef.current

        
        if (!content.trim()) {
          alert('文档内容为空，无法导出PDF')
          return
        }
        
        if (window.electronAPI) {
          try {

            
            // 使用相同的处理链将Markdown转换为HTML
            const processor = unified()
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
            
            const result = processor.processSync(content)
            const htmlContent = String(result)
            
            // 获取当前文件名
            const currentFileName = currentPath ? currentPath.split('/').pop() : undefined
            

            const exportResult = await window.electronAPI.exportPDF(htmlContent, currentFileName)
            
            if (exportResult.success) {

              // 延迟隐藏进度条，让用户看到"导出完成"
              setTimeout(async () => {
                setShowProgressDialog(false)
                await window.electronAPI.showSuccessDialog({
                  title: 'PDF导出成功',
                  message: `PDF已成功导出到:\n${exportResult.filePath}`
                })
              }, 1000)
            } else {
              // 如果导出失败，隐藏进度条（如果正在显示的话）
              setShowProgressDialog(false)
              console.error('PDF export failed:', exportResult.error)
              if (exportResult.error !== 'Save canceled') {
                await window.electronAPI.showSuccessDialog({
                  title: 'PDF导出失败',
                  message: `PDF导出失败: ${exportResult.error}`
                })
              }
            }
          } catch (error) {
            setShowProgressDialog(false)
            console.error('Error exporting PDF:', error)
            await window.electronAPI.showSuccessDialog({
              title: 'PDF导出错误',
              message: `PDF导出过程中发生错误: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
          }
        }
      }

      // 绑定所有菜单事件
      window.electronAPI.onMenuSave(handleMenuSave)
      window.electronAPI.onMenuSaveAs(handleMenuSaveAs)
      window.electronAPI.onMenuOpen(handleOpenFile)
      window.electronAPI.onMenuNewFile(handleNewFile)
      window.electronAPI.onMenuResetLayout(handleResetLayout)
      window.electronAPI.onMenuTogglePreview(handleTogglePreview)
      window.electronAPI.onMenuFind(handleMenuFind)
      window.electronAPI.onMenuReplace(handleMenuReplace)
      window.electronAPI.onMenuAbout(handleAbout)
      window.electronAPI.onMenuShortcuts(handleShortcuts)
      window.electronAPI.onSaveBeforeClose(handleSaveBeforeClose)
      window.electronAPI.onMenuExportPDF(handleExportPDF)
      
      // 监听PDF导出进度
      window.electronAPI.onPDFExportProgress((data) => {
        // 如果还没有显示进度对话框，则在收到第一个进度更新时显示
        setShowProgressDialog(true)
        setExportProgress(data.progress)
        setExportMessage(data.message)
      })

      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeAllListeners('file-opened')
          window.electronAPI.removeAllListeners('menu-save-file')
          window.electronAPI.removeAllListeners('menu-save-as-file')
          window.electronAPI.removeAllListeners('menu-open-file')
          window.electronAPI.removeAllListeners('menu-new-file')
          window.electronAPI.removeAllListeners('menu-reset-layout')
          window.electronAPI.removeAllListeners('menu-toggle-preview')
          window.electronAPI.removeAllListeners('menu-find')
          window.electronAPI.removeAllListeners('menu-replace')
          window.electronAPI.removeAllListeners('menu-about')
          window.electronAPI.removeAllListeners('menu-shortcuts')
          window.electronAPI.removeAllListeners('save-before-close')
          window.electronAPI.removeAllListeners('menu-export-pdf')
        }
      }
    }
  }, []) // 空依赖数组，只设置一次



  // 欢迎界面新建文件 - 使用useCallback优化
  const handleWelcomeNewFile = useCallback(async () => {
    await handleNewFile()
  }, [handleNewFile])

  // 欢迎界面打开文件 - 使用useCallback优化
  const handleWelcomeOpenFile = useCallback(async () => {
    await handleOpenFile()
  }, [handleOpenFile])

  return (
          <div className="app">
        <div className="header">
          <span className="header-title">
            {!showWelcome ? (
              <>
                <SiMarkdown className="markdown-icon" />
                {currentFilePath ? currentFilePath.split('/').pop() : 'untitled.md'}
                {hasUnsavedChanges && <span className="unsaved-dot"> •</span>}
              </>
            ) : (
              'Markdown Editor'
            )}
          </span>
        </div>
        {showWelcome ? (
          <WelcomeScreen 
            onNewFile={handleWelcomeNewFile}
            onOpenFile={handleWelcomeOpenFile}
          />
        ) : (
          <div className="editor-container" ref={containerRef}>
        <div 
          className="editor-panel" 
          ref={editorRef}
          style={{ width: showPreview ? `${editorWidth}%` : '100%', position: 'relative' }}
        >
                     <CodeMirror
            key={editorKey}
            value={markdownContent}
            onChange={handleContentChange}
            extensions={[markdownLang(), transparentTheme]}
            theme={oneDark}
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              dropCursor: false,
              allowMultipleSelections: false,
              highlightActiveLine: true,
              highlightSelectionMatches: false,
              searchKeymap: false, // 禁用默认搜索快捷键
            }}
            onCreateEditor={(view) => {
              editorViewRef.current = view
            }}
                               style={{
                     background: 'transparent',
                     backgroundColor: 'transparent',
                     height: '100%',
                     width: '100%',
                     overflow: 'hidden'
                   }}
                         />
             
             {/* 搜索覆盖组件 - 只在编辑器区域显示 */}
             <SearchOverlay
               isVisible={searchMode !== null}
               mode={searchMode}
               onClose={closeSearch}
               editorView={editorViewRef.current || undefined}
             />
             </div>
             {showPreview && (
               <>
                 <div 
                   className="resize-handle"
                   onMouseDown={handleMouseDown}
                   onDoubleClick={resetLayout}
                   title="拖拽调整宽度 | 双击重置 | Cmd/Ctrl+0 重置"
                   style={{ 
                     minHeight: '100%'
                   }}
                 />
                 <div 
                   className="preview-panel"
                   style={{ width: `${100 - editorWidth}%` }}
                 >
                   <MarkdownPreview content={debouncedContent} />
                 </div>
               </>
             )}
           </div>
        )}
        
        {/* PDF导出进度对话框 */}
        <ProgressDialog
          isVisible={showProgressDialog}
          progress={exportProgress}
          message={exportMessage}
        />
      </div>
    )
}

export default App 