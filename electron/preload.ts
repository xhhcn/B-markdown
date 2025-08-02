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
  
  // 监听文件保存完成事件
  onFileSaved: (callback: (filePath: string) => void) =>
    ipcRenderer.on('file-saved', (_, filePath) => callback(filePath)),
  
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
    return (window as any).__hasUnsavedChanges || false
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
    ipcRenderer.invoke('show-success-dialog', options),
  
  // 主题相关API
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (themeSource: 'system' | 'light' | 'dark') => ipcRenderer.invoke('set-theme', themeSource),
  onThemeChanged: (callback: (data: { shouldUseDarkColors: boolean; themeSource: string }) => void) =>
    ipcRenderer.on('theme-changed', (_, data) => callback(data)),
})

 