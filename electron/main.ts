import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

// 显示标准对话框
async function showAppDialog(parent: BrowserWindow, options: any) {
  return await dialog.showMessageBox(parent, options)
}

// 更可靠的开发模式检测
const isDev = !app.isPackaged

// 添加Chromium命令行开关来优化性能 - 必须在app启动前设置
app.commandLine.appendSwitch('disable-font-subpixel-positioning')
app.commandLine.appendSwitch('disable-system-font-check')
app.commandLine.appendSwitch('disable-font-feature-settings')
app.commandLine.appendSwitch('disable-font-loading-api')
app.commandLine.appendSwitch('disable-font-variations')
app.commandLine.appendSwitch('disable-font-rendering-hinting')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('enable-fast-unload')
app.commandLine.appendSwitch('enable-aggressive-domstorage-flushing')

let mainWindow: BrowserWindow | null = null
let isQuitting = false

// 防止多个实例
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // 当运行第二个实例时，将会聚焦到myWindow这个窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function createWindow() {
  // 防止创建多个窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webgl: false, // 禁用WebGL避免字体渲染问题
      experimentalFeatures: false, // 禁用实验性功能

      v8CacheOptions: 'code', // 启用V8代码缓存
      spellcheck: false, // 禁用拼写检查提升性能
    },
    titleBarStyle: 'hidden',
    show: false,
    transparent: true,
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
    frame: false,
    hasShadow: false, // 移除窗口阴影
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
    }
  })

  // 窗口关闭时清理引用
    // 窗口关闭前检查未保存更改
  mainWindow.on('close', async (event) => {
    if (!mainWindow) return
    
    // 如果正在强制退出，直接关闭，不检查未保存更改
    if (isQuitting) {
      console.log('Force quitting, closing window directly')
      return
    }
    
    // 阻止默认关闭行为，先检查
    event.preventDefault()
    
    // 请求渲染进程返回是否有未保存更改
    try {
      const hasUnsavedChanges = await mainWindow.webContents.executeJavaScript(`
        window.__hasUnsavedChanges || false
      `)
      
      console.log('Checking unsaved changes:', hasUnsavedChanges)
      
      if (hasUnsavedChanges) {
        // 显示确认对话框
        const choice = await showAppDialog(mainWindow, {
          type: 'warning',
          buttons: ['保存', '不保存', '取消'],
          defaultId: 0,
          cancelId: 2,
          title: '确认关闭',
          message: '文档有未保存的更改',
          detail: '是否保存更改后再关闭？'
        })
        
        if (choice.response === 0) {
          // 保存文件
          console.log('User chose to save before closing')
          mainWindow.webContents.send('save-before-close')
          
          // 监听保存完成事件，然后关闭
          ipcMain.once('save-completed', () => {
            console.log('Save completed, closing app')
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.destroy()
            }
          })
          
          // 设置超时保护，防止永远等待
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              console.log('Save timeout, forcing close')
              mainWindow.destroy()
            }
          }, 5000) // 给保存操作5秒时间
        } else if (choice.response === 1) {
          // 不保存，直接关闭
          console.log('User chose not to save, closing')
          mainWindow.destroy()
        }
        // 如果选择取消 (response === 2)，什么都不做，保持窗口打开
      } else {
        // 没有未保存更改，直接关闭
        console.log('No unsaved changes, closing normally')
        mainWindow.destroy()
      }
    } catch (error) {
      console.error('Error checking unsaved status:', error)
      // 出现错误时仍然关闭窗口
      mainWindow.destroy()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 开发模式下的错误处理
  if (isDev) {
    mainWindow.webContents.on('did-fail-load', () => {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://localhost:5173')
        }
      }, 1000)
    })
  }

  // 创建菜单
  createMenu()
}

// 已在上面设置过命令行开关，避免重复

// 在应用退出前设置退出标志
app.on('before-quit', () => {
  console.log('App is about to quit, setting isQuitting flag')
  isQuitting = true
})

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null || mainWindow.isDestroyed()) {
    createWindow()
  }
})

// 创建应用菜单
function createMenu() {
  const isMac = process.platform === 'darwin'
  
  const template: any[] = [
    // macOS应用菜单
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { 
          label: 'Quit ' + app.getName(),
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }
      ]
    }] : []),
    
    // File菜单
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-new-file')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-open-file')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            console.log('Menu Save clicked')
            if (mainWindow) {
              mainWindow.webContents.send('menu-save-file')
              console.log('Sent menu-save-file event to renderer')
            }
          }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            console.log('Menu Save As clicked')
            if (mainWindow) {
              mainWindow.webContents.send('menu-save-as-file')
              console.log('Sent menu-save-as-file event to renderer')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export PDF',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            console.log('Menu Export PDF clicked')
            if (mainWindow) {
              mainWindow.webContents.send('menu-export-pdf')
              console.log('Sent menu-export-pdf event to renderer')
            }
          }
        },
        { type: 'separator' },
        ...(isMac ? [] : [{
          label: 'Quit',
          accelerator: 'Ctrl+Q',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }])
      ]
    },
    
    // Edit菜单
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-find')
            }
          }
        },
        {
          label: 'Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-replace')
            }
          }
        }
      ]
    },
    
    // View菜单
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Preview',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-toggle-preview')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reset Layout',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-reset-layout')
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
    // Window菜单
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [])
      ]
    },
    
    // Help菜单
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Markdown Editor',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-about')
            }
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-shortcuts')
            }
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 打开文件
async function openFile() {
  console.log('Menu Open File clicked')
  if (!mainWindow) {
    console.error('No main window available')
    return
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    console.log('Opening file:', filePath)
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      console.log('File read successfully, content length:', content.length)
      mainWindow.webContents.send('file-opened', content, filePath)
      console.log('Sent file-opened event to renderer')
    } catch (error) {
      console.error('Error reading file:', error)
      dialog.showErrorBox('Error', `Failed to open file: ${error}`)
    }
  } else {
    console.log('File dialog canceled or no file selected')
  }
}

// IPC处理器
ipcMain.handle('open-file', async () => {
  if (!mainWindow) return null

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return { content, filePath }
    } catch (error) {
      dialog.showErrorBox('Error', `Failed to open file: ${error}`)
      return null
    }
  }
  return null
})

ipcMain.handle('save-file', async (_, content: string, filePath?: string) => {
  console.log('Save IPC called with filePath:', filePath)
  if (!mainWindow) return false

  try {
    if (filePath) {
      // 直接保存到当前文件
      console.log('Saving to existing file:', filePath)
      await fs.promises.writeFile(filePath, content, 'utf-8')
      console.log('File saved successfully')
      return true
    } else {
      // 如果没有文件路径，执行另存为
      console.log('No file path, showing save dialog')
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'untitled.md',
        filters: [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        console.log('Saving new file:', result.filePath)
        await fs.promises.writeFile(result.filePath, content, 'utf-8')
        return result.filePath
      }
    }
    return false
  } catch (error) {
    console.error('Error in save-file:', error)
    dialog.showErrorBox('Error', `Failed to save file: ${error}`)
    return false
  }
})

ipcMain.handle('save-as-file', async (_, content: string, currentFilePath?: string) => {
  console.log('Save As IPC called with currentFilePath:', currentFilePath)
  if (!mainWindow) return { success: false }

  try {
    // 提取当前文件名作为默认文件名
    let defaultPath = 'untitled.md'
    if (currentFilePath) {
      const path = require('path')
      defaultPath = path.basename(currentFilePath)
      console.log('Using default filename:', defaultPath)
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath,
      filters: [
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!result.canceled && result.filePath) {
      console.log('Saving as:', result.filePath)
      await fs.promises.writeFile(result.filePath, content, 'utf-8')
      return { success: true, filePath: result.filePath }
    }
    console.log('Save As dialog canceled')
    return { success: false }
  } catch (error) {
    console.error('Error in save-as-file:', error)
    dialog.showErrorBox('Error', `Failed to save file: ${error}`)
    return { success: false }
  }
})

// 显示未保存更改的确认对话框
ipcMain.handle('show-unsaved-changes-dialog', async (_, action: string) => {
  if (!mainWindow) return 2 // 默认返回取消

  try {
    const result = await showAppDialog(mainWindow, {
      type: 'warning',
      buttons: ['保存', '不保存', '取消'],
      defaultId: 0,
      cancelId: 2,
      title: '确认操作',
      message: '文档有未保存的更改',
      detail: `是否保存更改后再${action}？`
    })
    
    console.log(`User choice for ${action}:`, result.response)
    return result.response
  } catch (error) {
    console.error('Error showing unsaved changes dialog:', error)
    return 2 // 出错时返回取消
  }
})

// 处理打开外部链接
ipcMain.handle('open-external-link', async (_, url: string) => {
  try {
    // 验证URL格式
    const urlPattern = /^https?:\/\/.+/i
    if (!urlPattern.test(url)) {
      console.warn('Invalid URL format:', url)
      return
    }
    
    console.log('Opening external link:', url)
    await shell.openExternal(url)
  } catch (error) {
    console.error('Error opening external link:', error)
  }
})

// 处理显示成功对话框（使用应用图标）
ipcMain.handle('show-success-dialog', async (_, options: { title: string; message: string }) => {
  if (!mainWindow) return
  
  try {
    await showAppDialog(mainWindow, {
      type: 'info',
      title: options.title,
      message: options.message,
      buttons: ['OK']
    })
  } catch (error) {
    console.error('Error showing success dialog:', error)
  }
})

// 处理PDF导出
ipcMain.handle('export-pdf', async (_, htmlContent: string, currentFileName?: string, filePath?: string) => {
  if (!mainWindow) return { success: false, error: 'No main window available' }

  try {
    // 发送进度更新
    const sendProgress = (progress: number, message: string) => {
      mainWindow?.webContents.send('pdf-export-progress', { progress, message })
    }

    let savePath = filePath
    
    if (!savePath) {
      // 根据当前文件名生成默认PDF文件名
      let defaultFileName = 'document.pdf'
      if (currentFileName) {
        const nameWithoutExt = currentFileName.replace(/\.[^/.]+$/, '')
        defaultFileName = `${nameWithoutExt}.pdf`
      }

      // 显示保存对话框
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultFileName,
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Save canceled' }
      }
      
      savePath = result.filePath
    }

    // 只有在用户确认保存位置后才开始显示进度
    sendProgress(10, '准备导出...')
    sendProgress(20, '创建PDF窗口...')

    // 创建一个新的隐藏窗口来渲染PDF内容，并禁用系统字体回退
    const pdfWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
        // 禁用系统字体回退和Web字体加载
        webgl: false,
        experimentalFeatures: false,
      }
    })

    sendProgress(30, '生成PDF内容...')

    // 生成PDF专用的HTML内容
    const pdfHTML = generatePDFHTML(htmlContent)
    
    sendProgress(40, '加载页面内容...')
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pdfHTML)}`)
    
    sendProgress(60, '等待字体加载...')
    // 等待页面加载完成，减少等待时间以提升性能
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    sendProgress(70, '准备字体渲染...')
    // 简化字体检查，只验证基本字体可用性
    await pdfWindow.webContents.executeJavaScript(`
      new Promise((resolve) => {
        // 强制字体系统刷新并等待稳定
        const forceRender = () => {
          const testDiv = document.createElement('div');
          testDiv.style.fontFamily = '"Times New Roman", serif';
          testDiv.style.fontSize = '16px';
          testDiv.style.position = 'absolute';
          testDiv.style.top = '-9999px';
          testDiv.innerHTML = 'Test English 测试中文';
          document.body.appendChild(testDiv);
          
          // 强制浏览器计算样式
          window.getComputedStyle(testDiv).fontFamily;
          
          // 清理测试元素
          setTimeout(() => {
            document.body.removeChild(testDiv);
            resolve();
          }, 250);
        };
        
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setTimeout(forceRender, 100);
          });
        } else {
          setTimeout(forceRender, 500);
        }
      })
    `)
    
    sendProgress(80, '生成PDF文件...')
    // 生成PDF - 保持原始字体大小，通过自动换行处理溢出
    const pdfData = await pdfWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true, // 启用背景打印以支持emoji和颜色
      margins: {
        top: 0.5,  // 标准边距设置
        bottom: 0.5,
        left: 0.5,
        right: 0.5
      }
      // 移除scale设置，保持原始字体大小
    })

    sendProgress(90, '保存文件...')
    // 保存PDF文件
    await fs.promises.writeFile(savePath, pdfData)
    
    // 关闭PDF窗口
    pdfWindow.close()
    
    sendProgress(100, '导出完成')
    
    console.log('PDF exported successfully to:', savePath)
    return { success: true, filePath: savePath }
    
  } catch (error) {
    console.error('Error exporting PDF:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
})

// 生成PDF专用的HTML内容
function generatePDFHTML(htmlContent: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Export</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">
    <style>
        /* 专门为中文字符定义宋体，完全避免系统字体fallback */
        @font-face {
            font-family: "Times New Roman";
            src: local("SimSun"), local("宋体"), local("SimSun-ExtB");
            font-weight: normal;
            unicode-range: U+4E00-9FFF, U+3400-4DBF, U+20000-2A6DF, U+2A700-2B73F, U+2B740-2B81F, U+2B820-2CEAF, U+3000-303F, U+FF00-FFEF;
        }
        
        @font-face {
            font-family: "Times New Roman";
            src: local("SimSun Bold"), local("SimSun"), local("宋体");
            font-weight: bold;
            unicode-range: U+4E00-9FFF, U+3400-4DBF, U+20000-2A6DF, U+2A700-2B73F, U+2B740-2B81F, U+2B820-2CEAF, U+3000-303F, U+FF00-FFEF;
        }
        
        /* 确保英文字符使用真正的Times New Roman */
        @font-face {
            font-family: "Times New Roman";
            src: local("Times New Roman"), local("TimesNewRomanPSMT");
            font-weight: normal;
            unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }
        
        @font-face {
            font-family: "Times New Roman";
            src: local("Times New Roman Bold"), local("Times New Roman"), local("TimesNewRomanPS-BoldMT");
            font-weight: bold;
            unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }
        
        /* 为代码元素定义专用的等宽字体 */
        @font-face {
            font-family: "Courier New";
            src: local("Courier New"), local("CourierNewPSMT"), local("Courier");
            font-weight: normal;
        }
        
        @font-face {
            font-family: "Courier New";
            src: local("Courier New Bold"), local("Courier New"), local("CourierNewPS-BoldMT");
            font-weight: bold;
        }

        /* 简化emoji字体设置，避免系统字体回退 */
        @font-face {
            font-family: "Emoji";
            src: local("Apple Color Emoji"), local("Segoe UI Emoji"), local("Noto Color Emoji");
            font-weight: normal;
            font-display: optional;
            unicode-range: U+1F300-1F9FF, U+2600-27BF;
        }
        
        /* 标准Markdown PDF样式 - 使用最简单可靠的字体设置 */
        body {
            font-family: "Times New Roman", serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            background: white;
            font-synthesis: none;
            -webkit-font-feature-settings: normal;
            font-feature-settings: normal;
            -webkit-font-smoothing: never;
            -moz-osx-font-smoothing: unset;
            font-display: block;
            /* 全局换行设置，确保所有内容都能正确换行 */
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            box-sizing: border-box;
        }
        
        /* 确保所有元素都支持emoji渲染，并禁用字体合成 */
        *:not(code):not(pre):not(tt) {
            font-family: inherit;
            font-synthesis: none; /* 全局禁用字体合成，防止系统字体fallback */
            font-display: block; /* 阻止字体回退，强制使用指定字体 */
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* 代码元素专用设置 */
        code, pre, tt {
            font-synthesis: none;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* 强制禁用所有系统UI字体，但保留代码元素的等宽字体 */
        *:not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]) {
            font-family: "Times New Roman", serif !important;
            font-synthesis: none !important;
            font-display: block !important;
            -webkit-font-smoothing: never !important;
            -moz-osx-font-smoothing: unset !important;
        }
        
        /* 额外强制规则：防止任何系统UI字体回退，但不影响数学公式和代码元素 */
        h1:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        h2:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        h3:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        h4:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        h5:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        h6:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        p:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        div:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        span:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        strong:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        em:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        b:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        i:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]) {
            font-family: "Times New Roman", serif !important;
            font-synthesis: none !important;
            font-display: block !important;
        }
        
        /* 所有文本元素使用继承的字体设置，但不影响数学公式和代码元素 */
        p:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        li:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        blockquote:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        td:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        th:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        span:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]), 
        div:not(.katex):not([class*="katex"]):not(code):not(pre):not(tt):not([class*="hljs"]) {
            font-family: inherit;
            font-synthesis: none;
        }
        
        body > *:first-child {
            margin-top: 0 !important;
        }
        
        body > *:last-child {
            margin-bottom: 0 !important;
        }
        
        /* 标题样式 - 继承body的字体设置 */
        h1, h2, h3, h4, h5, h6 {
            margin: 20px 0 10px;
            padding: 0;
            font-weight: bold;
            cursor: text;
            position: relative;
            font-family: inherit;
            font-synthesis: none;
        }
        
        h2:first-child, h1:first-child, h1:first-child + h2, h3:first-child, h4:first-child, h5:first-child, h6:first-child {
            margin-top: 0;
            padding-top: 0;
        }
        
        h1 {
            font-size: 28px;
            color: black;
        }
        
        h2 {
            font-size: 24px;
            border-bottom: 1px solid #cccccc;
            color: black;
        }
        
        h3 {
            font-size: 18px;
        }
        
        h4 {
            font-size: 16px;
        }
        
        h5 {
            font-size: 13px;
        }
        
        h6 {
            color: #777777;
            font-size: 12px;
        }
        
        /* 段落和基本文本 */
        p, blockquote, ul, ol, dl, table, pre {
            margin: 15px 0;
        }
        
        /* 链接样式 - 符合官方Markdown PDF标准 */
        a {
            color: #0000EE !important; /* 标准蓝色链接 */
            text-decoration: underline !important; /* 必须有下划线 */
            border: none !important;
        }
        
        a:hover {
            color: #0000CC !important; /* 悬停时稍深的蓝色 */
            text-decoration: underline !important;
        }
        
        a:visited {
            color: #551A8B !important; /* 已访问链接的标准紫色 */
            text-decoration: underline !important;
        }
        
        a.absent {
            color: #cc0000 !important;
            text-decoration: underline !important;
        }
        
        /* PDF中链接保持蓝色下划线样式，但不显示URL - 符合官方Markdown PDF标准 */
        @media print {
            a {
                color: #0000EE !important;
                text-decoration: underline !important;
            }
            
            a:visited {
                color: #551A8B !important;
                text-decoration: underline !important;
            }
        }
        
        /* 列表样式 */
        ul, ol {
            padding-left: 30px;
        }
        
        ul :first-child, ol :first-child {
            margin-top: 0;
        }
        
        ul :last-child, ol :last-child {
            margin-bottom: 0;
        }
        
        li {
            margin: 4px 0; /* 列表项之间的小间距，与预览部分一致 */
        }
        
        /* 引用样式 */
        blockquote {
            border-left: 4px solid #dddddd;
            padding: 0 15px;
            color: #777777;
        }
        
        blockquote > :first-child {
            margin-top: 0;
        }
        
        blockquote > :last-child {
            margin-bottom: 0;
        }
        
        /* 代码样式 - 使用标准等宽字体栈，强制覆盖全局设置 */
        code, tt {
            margin: 0 2px;
            padding: 0 5px;
            white-space: nowrap;
            border: 1px solid #eaeaea;
            background-color: #f8f8f8;
            border-radius: 3px;
            font-family: "Courier New", Courier, "Liberation Mono", Monaco, Menlo, monospace !important;
            font-synthesis: none;
        }
        
        pre {
            background-color: #f8f8f8;
            border: 1px solid #cccccc;
            font-size: 13px;
            line-height: 19px;
            overflow: auto;
            padding: 6px 10px;
            border-radius: 3px;
            font-family: "Courier New", Courier, "Liberation Mono", Monaco, Menlo, monospace !important;
            font-synthesis: none;
            /* PDF导出优化：简化换行设置，去除缩进相关样式 */
            white-space: pre-wrap; /* 保持格式同时允许换行 */
            word-wrap: break-word; /* 允许长行换行 */
            overflow-wrap: break-word; /* 在必要时换行 */
            word-break: break-all; /* 在任何字符处都可以换行，避免缩进 */
            hyphens: none; /* 禁用连字符，保持代码原样 */
            max-width: 100%; /* 确保不超出容器宽度 */
            box-sizing: border-box; /* 包含padding和border在宽度内 */
            /* 去除缩进相关设置 */
            text-indent: 0; /* 重置文本缩进 */
            hanging-punctuation: none; /* 禁用悬挂标点 */
            text-align: left; /* 强制左对齐，避免缩进效果 */
        }
        
        pre code, pre tt {
            background-color: transparent;
            border: none;
            margin: 0;
            padding: 0;
            /* 继承父元素的换行设置，去除缩进相关样式 */
            white-space: pre-wrap; /* 与父元素pre保持一致，允许换行 */
            word-wrap: break-word; /* 与父元素保持一致 */
            overflow-wrap: break-word; /* 与父元素保持一致 */
            word-break: break-all; /* 与父元素保持一致，在任何字符处都可以换行 */
            hyphens: none; /* 与父元素保持一致 */
            font-family: inherit;
            text-align: left; /* 强制左对齐，避免缩进效果 */
        }
        
        /* 语法高亮优化 - 确保在PDF中正确显示 */
        .hljs {
            background: #f8f8f8 !important;
            color: #333 !important;
            font-family: "Courier New", Courier, "Liberation Mono", Monaco, Menlo, monospace !important;
        }
        
        /* 强制所有语法高亮元素使用等宽字体 */
        .hljs, .hljs *, 
        [class*="hljs-"], 
        pre .hljs *, 
        code .hljs *,
        pre span, pre code span, code span {
            font-family: "Courier New", Courier, "Liberation Mono", Monaco, Menlo, monospace !important;
            font-synthesis: none !important;
            font-display: block !important;
        }
        
        /* 确保语法高亮在打印时可见 */
        @media print {
            .hljs {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                background: #f8f8f8 !important;
                font-family: "Courier New", Courier, "Liberation Mono", Monaco, Menlo, monospace !important;
            }
            
            /* 打印时强制所有语法高亮元素使用等宽字体 */
            .hljs, .hljs *, 
            [class*="hljs-"], 
            pre .hljs *, 
            code .hljs *,
            pre span, pre code span, code span {
                font-family: "Courier New", Courier, "Liberation Mono", Monaco, Menlo, monospace !important;
                font-synthesis: none !important;
                font-display: block !important;
            }
            
            /* PDF学术风格语法高亮配色 - 适合打印的质朴色彩 */
            .hljs {
                background: #F8F9FA !important; /* 极淡的背景色，适合打印 */
                color: #333333 !important; /* 深色文本 */
            }
            
            .hljs-keyword,
            .hljs-selector-tag,
            .hljs-subst {
                color: #495057 !important; /* 深灰蓝色，关键字 */
            }
            
            /* 字符串 */
            .hljs-string,
            .hljs-doctag {
                color: #556B2F !important; /* 深橄榄绿，字符串 */
            }
            
            /* 注释 */
            .hljs-comment,
            .hljs-quote {
                color: #6C757D !important; /* 中性灰色，注释 */
                font-style: italic;
            }
            
            /* 数字 */
            .hljs-number,
            .hljs-literal {
                color: #8B4513 !important; /* 深棕色，数字 */
            }
            
            /* 函数名 */
            .hljs-function,
            .hljs-title {
                color: #4682B4 !important; /* 钢蓝色，函数名 */
            }
            
            /* 变量 */
            .hljs-variable,
            .hljs-attr {
                color: #8B6914 !important; /* 深金褐色，变量 */
            }
        }
        
        /* 表格样式 - PDF导出优化，确保不会横向溢出 */
        table {
            border-collapse: collapse;
            width: 100%;
            padding: 0;
            table-layout: fixed; /* 固定表格布局，防止溢出 */
            word-wrap: break-word; /* 单元格内容自动换行 */
            overflow-wrap: break-word; /* 强制长单词换行 */
            word-break: break-word; /* 更强的单词断行 */
            font-size: 0.9em; /* 官方标准：表格字体比正文小一号 */
            line-height: 1.4; /* 表格专用行距，保持可读性 */
        }
        
        table tr {
            border-top: 1px solid #cccccc;
            background-color: white;
            margin: 0;
            padding: 0;
        }
        
        table tr:nth-child(2n) {
            background-color: #f8f8f8;
        }
        
        table tr th {
            font-weight: bold;
            border: 1px solid #cccccc;
            text-align: left;
            margin: 0;
            padding: 6px 13px;
            word-wrap: break-word; /* 表头内容自动换行 */
            overflow-wrap: break-word; /* 兼容性设置 */
            word-break: break-word; /* 强制断行 */
            hyphens: auto; /* 启用连字符换行 */
            white-space: normal; /* 允许正常换行 */
            min-width: 0; /* 允许内容压缩 */
        }
        
        table tr td {
            border: 1px solid #cccccc;
            text-align: left;
            margin: 0;
            padding: 6px 13px;
            word-wrap: break-word; /* 单元格内容自动换行 */
            overflow-wrap: break-word; /* 兼容性设置 */
            word-break: break-word; /* 强制断行 */
            hyphens: auto; /* 启用连字符换行 */
            white-space: normal; /* 允许正常换行 */
            min-width: 0; /* 允许内容压缩 */
        }
        
        table tr th :first-child, table tr td :first-child {
            margin-top: 0;
        }
        
        table tr th :last-child, table tr td :last-child {
            margin-bottom: 0;
        }
        
        /* 水平分割线 */
        hr {
            border: 0 none;
            color: #cccccc;
            height: 4px;
            padding: 0;
        }
        
        /* 图片样式 */
        img {
            max-width: 100%;
        }
        
        /* KaTeX数学公式样式 - 基础设置 */
        .katex *, .katex .base, .katex .base * {
            color: #333 !important;
            font-family: "KaTeX_Main", "Times New Roman", "Liberation Serif", serif !important;
            font-synthesis: none !important;
            font-display: block !important;
        }
        
        /* 行内数学公式特定设置 */
        .katex {
            color: #333 !important;
            font-family: "KaTeX_Main", "Times New Roman", "Liberation Serif", serif !important;
            display: inline !important;
            vertical-align: baseline !important;
            font-size: inherit !important;
            font-synthesis: none !important;
            font-display: block !important;
            max-width: 100%;
            overflow-x: auto;
            word-wrap: break-word;
        }
        
        .katex-display {
            margin: 16px 0 !important;
            text-align: center;
            font-family: "Times New Roman", "Liberation Serif", serif !important;
            /* PDF导出优化：确保显示数学公式不会横向溢出 */
            max-width: 100%;
            overflow-x: auto;
            word-wrap: break-word;
            /* 对于过长的公式，允许左对齐以便阅读 */
            text-align: left;
            padding-left: 1em;
            /* 确保块级公式保持块级显示 */
            display: block !important;
            color: #333 !important;
            font-synthesis: none !important;
            font-display: block !important;
        }
        
        /* 对数字、字母和数学操作符设置统一字体 */
        .katex .mord {
            font-family: "Times New Roman", "Liberation Serif", serif !important;
        }
        
        /* 数学操作符(lim, sin, cos, log等)使用相同字体确保一致性 */
        .katex .mop {
            font-family: "Times New Roman", "Liberation Serif", serif !important;
        }
        
        /* 二元运算符和关系符号保持原始渲染 */
        .katex .mbin,
        .katex .mrel {
            font-family: KaTeX_Main, "Times New Roman", serif !important;
        }
        
        /* 保留操作符和括号的默认数学字体，以确保正确显示 */
        .katex .mopen, 
        .katex .mclose {
            font-family: KaTeX_Main, "Times New Roman", serif !important;
        }
        
        /* 保留根号和分数线的默认渲染 */
        .katex .sqrt-line,
        .katex .sqrt-sign,
        .katex .frac-line {
            font-family: KaTeX_Main, serif !important;
        }
        
        /* 打印优化 */
        @media print {
            /* 数学公式PDF渲染优化 - 基础设置 */
            .katex *, .katex .base, .katex .base * {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                font-family: "KaTeX_Main", "Times New Roman", "Liberation Serif", serif !important;
                color: #000 !important;
                font-synthesis: none !important;
                font-display: block !important;
            }
            
            /* PDF中行内数学公式特定设置 */
            .katex {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                font-size: inherit !important;
                font-family: "KaTeX_Main", "Times New Roman", "Liberation Serif", serif !important;
                display: inline !important;
                vertical-align: baseline !important;
                color: #000 !important;
                font-synthesis: none !important;
                font-display: block !important;
            }
            
            .katex-display {
                page-break-inside: avoid;
                margin: 1em 0 !important;
                font-family: "Times New Roman", "Liberation Serif", serif !important;
                /* 确保PDF中块级公式保持块级显示 */
                display: block !important;
                color: #000 !important;
                font-synthesis: none !important;
                font-display: block !important;
            }
            
            /* PDF打印时对数字、字母和数学操作符设置统一字体 */
            .katex .mord {
                font-family: "Times New Roman", "Liberation Serif", serif !important;
            }
            
            /* PDF打印时数学操作符(lim, sin, cos, log等)使用相同字体 */
            .katex .mop {
                font-family: "Times New Roman", "Liberation Serif", serif !important;
            }
            
            /* PDF打印时二元运算符和关系符号保持原始渲染 */
            .katex .mbin,
            .katex .mrel {
                font-family: KaTeX_Main, "Times New Roman", serif !important;
            }
            
            /* PDF打印时保留操作符和括号的默认数学字体 */
            .katex .mopen, 
            .katex .mclose {
                font-family: KaTeX_Main, "Times New Roman", serif !important;
            }
            
            /* PDF打印时保留根号和分数线的默认渲染 */
            .katex .sqrt-line,
            .katex .sqrt-sign,
            .katex .frac-line {
                font-family: KaTeX_Main, serif !important;
            }
            
            body {
                margin: 0;
                padding: 20px;
                font-size: 12pt;
                line-height: 1.5;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            
            pre, blockquote, table {
                page-break-inside: avoid;
            }
            
            /* PDF打印时的溢出处理优化 - 强制换行 */
            * {
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                hyphens: auto !important;
                box-sizing: border-box !important;
            }
            
            table {
                table-layout: fixed !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
                width: 100% !important;
                font-size: 0.9em !important; /* 官方标准：表格字体比正文小一号 */
                line-height: 1.4 !important; /* 表格专用行距，保持可读性 */
            }
            
            table th, table td {
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
                hyphens: auto !important;
                white-space: normal !important;
                min-width: 0 !important;
                max-width: none !important;
            }
            
            pre {
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-all !important;
                hyphens: none !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                text-indent: 0 !important;
                hanging-punctuation: none !important;
                text-align: left !important;
            }
            
            pre code, pre tt {
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-all !important;
                hyphens: none !important;
                text-align: left !important;
            }
            
            .katex, .katex-display {
                max-width: 100% !important;
                overflow: visible !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
            }
            
            .katex-display {
                text-align: left !important;
                padding-left: 1em !important;
            }
            
            /* 确保长URL、长文本等都能正确换行 */
            p, div, span, li, blockquote {
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                hyphens: auto !important;
            }
            
            img {
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            
            a {
                color: #333 !important;
                text-decoration: none;
            }
            
            /* 确保数学公式在打印时正确显示 - 最终覆盖规则 */
            .katex *, .katex .base, .katex .base * {
                color: #000 !important;
                font-family: "KaTeX_Main", "Times New Roman", "Liberation Serif", serif !important;
                font-synthesis: none !important;
                font-display: block !important;
            }
            
            /* 行内公式保持inline */
            .katex {
                color: #000 !important;
                display: inline !important;
                vertical-align: baseline !important;
                font-family: "KaTeX_Main", "Times New Roman", "Liberation Serif", serif !important;
                font-synthesis: none !important;
                font-display: block !important;
            }
            
            /* 块级公式保持block */
            .katex-display {
                color: #000 !important;
                display: block !important;
                font-family: "KaTeX_Main", "Times New Roman", "Liberation Serif", serif !important;
                font-synthesis: none !important;
                font-display: block !important;
            }
        }
    </style>
</head>
<body>
    <div class="markdown-body">${htmlContent}</div>
</body>
</html>
  `
} 