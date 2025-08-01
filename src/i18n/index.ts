// 国际化系统
export interface I18nKeys {
  // 应用通用
  appName: string
  
  // 欢迎界面
  welcomeTitle: string
  welcomeSubtitle: string
  newFile: string
  openFile: string
  welcomeShortcuts: string
  
  // UI 提示
  resizeHandleTooltip: string
  searchPlaceholder: string
  replacePlaceholder: string
  
  // PDF 导出
  exportPdf: string
  preparingFonts: string
  pdfExportSuccess: string
  
  // PDF 导出进度消息
  pdfProgress: {
    preparing: string
    creatingWindow: string
    generatingContent: string
    loadingContent: string
    waitingFonts: string
    preparingRender: string
    generatingFile: string
    savingFile: string
    completed: string
  }
  
  // PDF 导出对话框消息
  pdfExportSuccessTitle: string
  pdfExportFailedTitle: string
  pdfExportErrorTitle: string
  pdfExportFailedMessage: (error: string) => string
  pdfExportErrorMessage: (error: string) => string
  emptyDocumentAlert: string
  
  // 菜单
  menu: {
    file: string
    newFile: string
    openFile: string
    save: string
    saveAs: string
    exportPDF: string
    defaultTheme: string
    academicTheme: string
    quit: string
    
    edit: string
    undo: string
    redo: string
    cut: string
    copy: string
    paste: string
    selectAll: string
    find: string
    replace: string
    
    view: string
    togglePreview: string
    resetLayout: string
    reload: string
    forceReload: string
    toggleDevTools: string
    resetZoom: string
    zoomIn: string
    zoomOut: string
    toggleFullscreen: string
    
    window: string
    minimize: string
    zoom: string
    close: string
    front: string
    
    help: string
    keyboardShortcuts: string
    aboutApp: string
  }
  
  // 对话框
  dialogs: {
    // 未保存更改
    unsavedChanges: {
      title: string
      message: string
      detail: string
      save: string
      dontSave: string
      cancel: string
    }
    
    // 操作类型
    actions: {
      newFile: string
      openFile: string
    }
    
    // 窗口关闭确认
    confirmClose: {
      title: string
      message: string
      detail: string
    }
    
    // 文件对话框
    fileDialogs: {
      markdownFiles: string
      allFiles: string
    }
    
    // 成功对话框
    success: {
      title: string
      message: string
    }
    
    // 错误消息
    errors: {
      noMainWindow: string
      noFileSelected: string
      saveCanceled: string
      unknownError: string
    }
  }
}

// 中文翻译
const zh: I18nKeys = {
  appName: 'B-Markdown',
  
  welcomeTitle: 'B-Markdown',
  welcomeSubtitle: '开始您的Markdown创作之旅',
  newFile: '新建文件',
  openFile: '打开文件',
  welcomeShortcuts: '快捷键: Cmd/Ctrl+N 新建 • Cmd/Ctrl+O 打开',
  
  resizeHandleTooltip: '拖拽调整宽度 | 双击重置 | Cmd/Ctrl+0 重置',
  searchPlaceholder: '查找...',
  replacePlaceholder: '替换为...',
  
  exportPdf: '导出PDF',
  preparingFonts: '准备字体渲染...',
  pdfExportSuccess: 'PDF已成功导出到：',
  
  pdfProgress: {
    preparing: '准备导出...',
    creatingWindow: '创建PDF窗口...',
    generatingContent: '生成PDF内容...',
    loadingContent: '加载页面内容...',
    waitingFonts: '等待字体加载...',
    preparingRender: '准备字体渲染...',
    generatingFile: '生成PDF文件...',
    savingFile: '保存文件...',
    completed: '导出完成'
  },
  
  pdfExportSuccessTitle: 'PDF导出成功',
  pdfExportFailedTitle: 'PDF导出失败',
  pdfExportErrorTitle: 'PDF导出错误',
  pdfExportFailedMessage: (error: string) => `PDF导出失败: ${error}`,
  pdfExportErrorMessage: (error: string) => `PDF导出过程中发生错误: ${error}`,
  emptyDocumentAlert: '文档内容为空，无法导出PDF',
  
  menu: {
    file: '文件',
    newFile: '新建文件',
    openFile: '打开文件',
    save: '保存',
    saveAs: '另存为...',
    exportPDF: '导出PDF',
    defaultTheme: '默认主题',
    academicTheme: '学术主题',
    quit: '退出',
    
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    find: '查找',
    replace: '替换',
    
    view: '视图',
    togglePreview: '切换预览',
    resetLayout: '重置布局',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '切换开发者工具',
    resetZoom: '重置缩放',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullscreen: '切换全屏',
    
    window: '窗口',
    minimize: '最小化',
    zoom: '缩放',
    close: '关闭',
    front: '前置',
    
    help: '帮助',
    keyboardShortcuts: '键盘快捷键',
    aboutApp: '关于 B-Markdown'
  },
  
  dialogs: {
    unsavedChanges: {
      title: '未保存的更改',
      message: '文档有未保存的更改',
      detail: '是否保存更改？',
      save: '保存',
      dontSave: '不保存',
      cancel: '取消'
    },
    
    actions: {
      newFile: '新建文件',
      openFile: '打开文件'
    },
    
    confirmClose: {
      title: '确认关闭',
      message: '文档有未保存的更改',
      detail: '是否保存更改后再关闭？'
    },
    
    fileDialogs: {
      markdownFiles: 'Markdown 文件',
      allFiles: '所有文件'
    },
    
    success: {
      title: '成功',
      message: '操作成功完成'
    },
    
    errors: {
      noMainWindow: '主窗口不可用',
      noFileSelected: '未选择文件',
      saveCanceled: '保存已取消',
      unknownError: '未知错误'
    }
  }
}

// 英文翻译
const en: I18nKeys = {
  appName: 'B-Markdown',
  
  welcomeTitle: 'B-Markdown',
  welcomeSubtitle: 'Start Your Markdown Journey',
  newFile: 'New File',
  openFile: 'Open File',
  welcomeShortcuts: 'Shortcuts: Cmd/Ctrl+N New • Cmd/Ctrl+O Open',
  
  resizeHandleTooltip: 'Drag to resize | Double-click to reset | Cmd/Ctrl+0 to reset',
  searchPlaceholder: 'Find...',
  replacePlaceholder: 'Replace with...',
  
  exportPdf: 'Export PDF',
  preparingFonts: 'Preparing font rendering...',
  pdfExportSuccess: 'PDF successfully exported to:',
  
  pdfProgress: {
    preparing: 'Preparing export...',
    creatingWindow: 'Creating PDF window...',
    generatingContent: 'Generating PDF content...',
    loadingContent: 'Loading page content...',
    waitingFonts: 'Waiting for fonts...',
    preparingRender: 'Preparing font rendering...',
    generatingFile: 'Generating PDF file...',
    savingFile: 'Saving file...',
    completed: 'Export completed'
  },
  
  pdfExportSuccessTitle: 'PDF Export Successful',
  pdfExportFailedTitle: 'PDF Export Failed',
  pdfExportErrorTitle: 'PDF Export Error',
  pdfExportFailedMessage: (error: string) => `PDF export failed: ${error}`,
  pdfExportErrorMessage: (error: string) => `Error occurred during PDF export: ${error}`,
  emptyDocumentAlert: 'Document is empty, cannot export PDF',
  
  menu: {
    file: 'File',
    newFile: 'New File',
    openFile: 'Open File',
    save: 'Save',
    saveAs: 'Save As...',
    exportPDF: 'Export PDF',
    defaultTheme: 'Default Theme',
    academicTheme: 'Academic Theme',
    quit: 'Quit',
    
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    find: 'Find',
    replace: 'Replace',
    
    view: 'View',
    togglePreview: 'Toggle Preview',
    resetLayout: 'Reset Layout',
    reload: 'Reload',
    forceReload: 'Force Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Fullscreen',
    
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    close: 'Close',
    front: 'Bring All to Front',
    
    help: 'Help',
    keyboardShortcuts: 'Keyboard Shortcuts',
    aboutApp: 'About B-Markdown'
  },
  
  dialogs: {
    unsavedChanges: {
      title: 'Unsaved Changes',
      message: 'The document has unsaved changes',
      detail: 'Do you want to save the changes?',
      save: 'Save',
      dontSave: "Don't Save",
      cancel: 'Cancel'
    },
    
    actions: {
      newFile: 'create a new file',
      openFile: 'open a file'
    },
    
    confirmClose: {
      title: 'Confirm Close',
      message: 'The document has unsaved changes',
      detail: 'Do you want to save the changes before closing?'
    },
    
    fileDialogs: {
      markdownFiles: 'Markdown Files',
      allFiles: 'All Files'
    },
    
    success: {
      title: 'Success',
      message: 'Operation completed successfully'
    },
    
    errors: {
      noMainWindow: 'No main window available',
      noFileSelected: 'No file selected',
      saveCanceled: 'Save canceled',
      unknownError: 'Unknown error'
    }
  }
}

// 支持的语言
export const languages = {
  'zh': zh,
  'en': en
} as const

export type SupportedLanguage = keyof typeof languages

// 检测系统语言
export function detectSystemLanguage(): SupportedLanguage {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase()
    if (lang.startsWith('zh')) return 'zh'
  }
  return 'en'
}

// 当前语言
let currentLanguage: SupportedLanguage = detectSystemLanguage()

// 获取翻译
export function t(): I18nKeys {
  return languages[currentLanguage]
}

// 设置语言
export function setLanguage(lang: SupportedLanguage) {
  currentLanguage = lang
}

// 获取当前语言
export function getCurrentLanguage(): SupportedLanguage {
  return currentLanguage
}

export default t