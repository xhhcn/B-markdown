import { contextBridge, ipcRenderer } from 'electron'

// 暴露文件操作API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 打开文件
  openFile: () => ipcRenderer.invoke('open-file'),
  
  // 保存文件
  saveFile: (content: string, filePath?: string) => 
    ipcRenderer.invoke('save-file', content, filePath),
  
  // 另存为
  saveAsFile: (content: string, currentFilePath?: string) => 
    ipcRenderer.invoke('save-as-file', content, currentFilePath),
  
  // 显示未保存更改确认对话框
  showUnsavedChangesDialog: (action: string) => 
    ipcRenderer.invoke('show-unsaved-changes-dialog', action),
  
  // 监听文件打开事件
  onFileOpened: (callback: (content: string, filePath: string) => void) =>
    ipcRenderer.on('file-opened', (_, content, filePath) => callback(content, filePath)),
  
  // 监听菜单事件
  onMenuSave: (callback: () => void) =>
    ipcRenderer.on('menu-save-file', callback),
  
  onMenuSaveAs: (callback: () => void) =>
    ipcRenderer.on('menu-save-as-file', callback),

  onMenuOpen: (callback: () => void) =>
    ipcRenderer.on('menu-open-file', callback),

  // 监听其他菜单事件
  onMenuNewFile: (callback: () => void) =>
    ipcRenderer.on('menu-new-file', callback),

  onMenuResetLayout: (callback: () => void) =>
    ipcRenderer.on('menu-reset-layout', callback),

  onMenuTogglePreview: (callback: () => void) =>
    ipcRenderer.on('menu-toggle-preview', callback),

  onMenuAbout: (callback: () => void) =>
    ipcRenderer.on('menu-about', callback),

  onMenuShortcuts: (callback: () => void) =>
    ipcRenderer.on('menu-shortcuts', callback),

  onMenuFind: (callback: () => void) =>
    ipcRenderer.on('menu-find', callback),

  onMenuReplace: (callback: () => void) =>
    ipcRenderer.on('menu-replace', callback),

  onMenuExportPDF: (callback: (theme?: string) => void) =>
    ipcRenderer.on('menu-export-pdf', (_, theme) => callback(theme)),
  
  // 移除监听器
  removeAllListeners: (channel: string) => 
    ipcRenderer.removeAllListeners(channel),
  
  // 监听关闭前保存事件
  onSaveBeforeClose: (callback: () => void) =>
    ipcRenderer.on('save-before-close', callback),
  
  // 用于主进程获取未保存状态的全局函数
  getUnsavedStatus: () => {
    // 这个函数会被主进程通过executeJavaScript调用
    return window.__hasUnsavedChanges || false
  },
  
  // 通知主进程保存完成
  notifySaveCompleted: () => ipcRenderer.send('save-completed'),
  
  // 打开外部链接
  openExternalLink: (url: string) => ipcRenderer.invoke('open-external-link', url),
  
  // 导出PDF
  exportPDF: (content: string, currentFileName?: string, theme: string = 'default', filePath?: string) => 
    ipcRenderer.invoke('export-pdf', content, currentFileName, theme, filePath),
  
  // 监听PDF导出进度
  onPDFExportProgress: (callback: (data: { progress: number; message: string }) => void) =>
    ipcRenderer.on('pdf-export-progress', (_, data) => callback(data)),
  
  // 显示成功对话框
  showSuccessDialog: (options: { title: string; message: string }) =>
    ipcRenderer.invoke('show-success-dialog', options)
})

// 声明全局类型
declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ content: string; filePath: string } | null>
      saveFile: (content: string, filePath?: string) => Promise<boolean | string>
      saveAsFile: (content: string, currentFilePath?: string) => Promise<{ success: boolean; filePath?: string }>
      showUnsavedChangesDialog: (action: string) => Promise<number>
      onFileOpened: (callback: (content: string, filePath: string) => void) => void
      onMenuSave: (callback: () => void) => void
      onMenuSaveAs: (callback: () => void) => void
      onMenuOpen: (callback: () => void) => void
      onMenuNewFile: (callback: () => void) => void
      onMenuResetLayout: (callback: () => void) => void
      onMenuTogglePreview: (callback: () => void) => void
      onMenuAbout: (callback: () => void) => void
      onMenuShortcuts: (callback: () => void) => void
      onMenuFind: (callback: () => void) => void
      onMenuReplace: (callback: () => void) => void
      onMenuExportPDF: (callback: (theme?: string) => void) => void
      onSaveBeforeClose: (callback: () => void) => void
      removeAllListeners: (channel: string) => void
      getUnsavedStatus: () => boolean
      notifySaveCompleted: () => void
      openExternalLink: (url: string) => Promise<void>
      exportPDF: (content: string, currentFileName?: string, theme?: string, filePath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
      onPDFExportProgress: (callback: (data: { progress: number; message: string }) => void) => void
    }
    __hasUnsavedChanges?: boolean
  }
} 