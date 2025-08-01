declare global {
  interface Window {
    electronAPI: {
      // 文件操作
      openFile: () => Promise<{ success: boolean; content?: string; path?: string }>;
      saveFile: (content: string, path?: string) => Promise<{ success: boolean; path?: string }>;
      saveAsFile: (content: string, path?: string) => Promise<{ success: boolean; path?: string }>;
      
      // PDF导出
      exportPDF: (htmlContent: string, fileName: string, theme: string) => Promise<{ success: boolean; path?: string }>;
      
      // 对话框
      showUnsavedChangesDialog: (action: string) => Promise<number>;
      showSuccessDialog: (options: { title: string; message: string }) => Promise<void>;
      
      // 外部链接
      openExternalLink?: (url: string) => void;
      
      // 事件监听器
      onFileOpened: (callback: (data: { content: string; path: string }) => void) => void;
      onMenuSave: (callback: () => void) => void;
      onMenuSaveAs: (callback: () => void) => void;
      onMenuOpen: (callback: () => void) => void;
      onMenuNewFile: (callback: () => void) => void;
      onMenuResetLayout: (callback: () => void) => void;
      onMenuTogglePreview: (callback: () => void) => void;
      onMenuFind: (callback: () => void) => void;
      onMenuReplace: (callback: () => void) => void;
      onMenuAbout: (callback: () => void) => void;
      onMenuShortcuts: (callback: () => void) => void;
      onSaveBeforeClose: (callback: () => void) => void;
      onMenuExportPDF: (callback: (theme: string) => void) => void;
      onPDFExportProgress: (callback: (data: any) => void) => void;
      
      // 移除监听器
      removeAllListeners: (event: string) => void;
      
      // 其他
      notifySaveCompleted?: () => void;
    };
    
    __hasUnsavedChanges: boolean;
  }
}

export {};