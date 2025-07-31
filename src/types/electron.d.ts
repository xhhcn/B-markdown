export interface ElectronAPI {
  // File operations
  openFile: () => Promise<{ success: boolean; content?: string; path?: string; error?: string }>
  saveFile: (content: string, currentPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>
  saveAsFile: (content: string, currentPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>
  
  // Dialog operations
  showUnsavedChangesDialog: (action: string) => Promise<'save' | 'discard' | 'cancel'>
  showSuccessDialog: (options: { title: string; message: string }) => Promise<void>
  
  // PDF export
  exportPDF: (htmlContent: string, currentFileName?: string) => Promise<{ success: boolean; path?: string; error?: string }>
  
  // External links
  openExternalLink: (url: string) => void
  
  // Menu event listeners
  onFileOpened: (callback: (data: { content: string; path: string }) => void) => void
  onMenuSave: (callback: () => void) => void
  onMenuSaveAs: (callback: () => void) => void
  onMenuOpen: (callback: () => void) => void
  onMenuNewFile: (callback: () => void) => void
  onMenuResetLayout: (callback: () => void) => void
  onMenuTogglePreview: (callback: () => void) => void
  onMenuFind: (callback: () => void) => void
  onMenuReplace: (callback: () => void) => void
  onMenuAbout: (callback: () => void) => void
  onMenuShortcuts: (callback: () => void) => void
  onMenuExportPDF: (callback: () => void) => void
  onSaveBeforeClose: (callback: () => void) => void
  onPDFExportProgress: (callback: (data: { progress: number; message: string }) => void) => void
  
  // Cleanup
  removeAllListeners: (event: string) => void
  
  // Save completion notification
  notifySaveCompleted?: () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    __hasUnsavedChanges?: boolean
  }
}

export {}