import { app, BrowserWindow, Menu, dialog, ipcMain, shell, Tray, nativeTheme } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

// 显示标准对话框
async function showAppDialog(parent: BrowserWindow, options: any) {
  return await dialog.showMessageBox(parent, options)
}

// 更可靠的开发模式检测
const isDev = !app.isPackaged

// 添加Chromium命令行开关来优化字体渲染，保留emoji支持
app.commandLine.appendSwitch('disable-font-subpixel-positioning')
app.commandLine.appendSwitch('disable-system-font-check')
// 保留emoji字体支持，移除可能影响emoji渲染的参数
// app.commandLine.appendSwitch('disable-font-feature-settings')
// app.commandLine.appendSwitch('disable-font-loading-api')
app.commandLine.appendSwitch('disable-font-variations')
app.commandLine.appendSwitch('disable-font-rendering-hinting')
// 减少输入法相关错误
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

let mainWindow: BrowserWindow | null = null
let allWindows: BrowserWindow[] = [] // 跟踪所有窗口
let isQuitting = false // 添加退出标志

// 防止多个实例
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // 当运行第二个实例时，聚焦到最新的窗口或创建主窗口
    if (allWindows.length > 0) {
      const lastWindow = allWindows[allWindows.length - 1]
      if (lastWindow && !lastWindow.isDestroyed()) {
        if (lastWindow.isMinimized()) lastWindow.restore()
        lastWindow.focus()
      }
    } else {
      // 确保创建主窗口
      if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow()
      }
    }
  })
}

function createWindow() {
  // 如果主窗口不存在，创建它；否则创建新窗口
  if (!mainWindow || mainWindow.isDestroyed()) {
    // 创建主窗口
  } else {
    // 主窗口已存在，直接创建新窗口
    createNewWindow()
    return
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    title: 'B-Markdown', // 显式设置窗口标题
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webgl: false, // 禁用WebGL避免字体渲染问题
      experimentalFeatures: false, // 禁用实验性功能
      spellcheck: false, // 禁用拼写检查，可能减少输入法相关错误
    },
    titleBarStyle: 'hidden',
    show: false,
    transparent: true,
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
    frame: false,
    hasShadow: false, // 移除窗口阴影
    acceptFirstMouse: true, // 减少鼠标事件相关问题
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

    // 窗口关闭前检查未保存更改
  mainWindow.on('close', async (event) => {
    if (!mainWindow) return
    
    // 如果是应用级退出（如菜单Quit、Cmd+Q等），直接关闭，不检查未保存更改
    if (isQuitting) {
      return // 允许默认关闭行为
    }
    
    // 阻止默认关闭行为，先检查未保存更改
    event.preventDefault()
    
    // 请求渲染进程返回是否有未保存更改
    try {
      const hasUnsavedChanges = await mainWindow.webContents.executeJavaScript(`
        window.__hasUnsavedChanges || false
      `)
      

      
      if (hasUnsavedChanges) {
        // 根据系统语言选择对话框文本
        const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
        
        const dialogOptions = isZh ? {
          type: 'warning' as const,
          buttons: ['保存', '不保存', '取消'],
          defaultId: 0,
          cancelId: 2,
          title: '确认关闭',
          message: '文档有未保存的更改',
          detail: '是否保存更改后再关闭？'
        } : {
          type: 'warning' as const,
          buttons: ['Save', "Don't Save", 'Cancel'],
          defaultId: 0,
          cancelId: 2,
          title: 'Confirm Close',
          message: 'The document has unsaved changes',
          detail: 'Do you want to save the changes before closing?'
        }
        
        // 显示确认对话框
        const choice = await showAppDialog(mainWindow, dialogOptions)
        
        if (choice.response === 0) {
          // 保存文件
          mainWindow.webContents.send('save-before-close')
          
          // 监听保存完成事件，然后关闭
          ipcMain.once('save-completed', () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.destroy()
            }
          })
          
          // 设置超时保护，防止永远等待
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.destroy()
            }
          }, 5000) // 给保存操作5秒时间
        } else if (choice.response === 1) {
          // 不保存，直接关闭
          mainWindow.destroy()
        }
        // 如果选择取消 (response === 2)，什么都不做，保持窗口打开
      } else {
        // 没有未保存更改，直接关闭
        mainWindow.destroy()
      }
    } catch (error) {
      // 出现错误时仍然关闭窗口
      mainWindow.destroy()
    }
  })

  mainWindow.on('closed', () => {
    // 从窗口列表中移除
    const index = allWindows.indexOf(mainWindow!)
    if (index > -1) {
      allWindows.splice(index, 1)
    }
    mainWindow = null
  })
  
  // 添加到窗口列表
  allWindows.push(mainWindow)

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

// 创建新窗口（多窗口支持）
function createNewWindow() {
  const newWindow = new BrowserWindow({
    width: 900,
    height: 600,
    title: 'B-Markdown', // 显式设置窗口标题
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webgl: false, // 禁用WebGL避免字体渲染问题
      experimentalFeatures: false, // 禁用实验性功能
      spellcheck: false, // 禁用拼写检查，可能减少输入法相关错误
    },
    titleBarStyle: 'hidden',
    show: false,
    transparent: true,
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
    frame: false,
    hasShadow: false, // 移除窗口阴影
    acceptFirstMouse: true, // 减少鼠标事件相关问题
  })

  if (isDev) {
    newWindow.loadURL('http://localhost:5173')
  } else {
    newWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  newWindow.once('ready-to-show', () => {
    if (newWindow && !newWindow.isDestroyed()) {
      newWindow.show()
    }
  })

  // 窗口关闭前检查未保存更改
  newWindow.on('close', async (event) => {
    if (!newWindow) return
    
    // 如果是应用级退出，直接关闭，不检查未保存更改
    if (isQuitting) {
      return // 允许默认关闭行为
    }
    
    // 阻止默认关闭行为，先检查未保存更改
    event.preventDefault()
    
    // 请求渲染进程返回是否有未保存更改
    try {
      const hasUnsavedChanges = await newWindow.webContents.executeJavaScript(`
        window.__hasUnsavedChanges || false
      `)
      
      if (hasUnsavedChanges) {
        // 根据系统语言选择对话框文本
        const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
        
        const dialogOptions = isZh ? {
          type: 'warning' as const,
          buttons: ['保存', '不保存', '取消'],
          defaultId: 0,
          cancelId: 2,
          title: '确认关闭',
          message: '文档有未保存的更改',
          detail: '是否保存更改后再关闭？'
        } : {
          type: 'warning' as const,
          buttons: ['Save', "Don't Save", 'Cancel'],
          defaultId: 0,
          cancelId: 2,
          title: 'Confirm Close',
          message: 'The document has unsaved changes',
          detail: 'Do you want to save the changes before closing?'
        }
        
        // 显示确认对话框
        const choice = await showAppDialog(newWindow, dialogOptions)
        
        if (choice.response === 0) {
          // 保存文件
          newWindow.webContents.send('save-before-close')
          
          // 监听保存完成事件，然后关闭
          ipcMain.once('save-completed', () => {
            if (newWindow && !newWindow.isDestroyed()) {
              newWindow.destroy()
            }
          })
          
          // 设置超时保护，防止永远等待
          setTimeout(() => {
            if (newWindow && !newWindow.isDestroyed()) {
              newWindow.destroy()
            }
          }, 5000) // 给保存操作5秒时间
        } else if (choice.response === 1) {
          // 不保存，直接关闭
          newWindow.destroy()
        }
        // 如果选择取消 (response === 2)，什么都不做，保持窗口打开
      } else {
        // 没有未保存更改，直接关闭
        newWindow.destroy()
      }
    } catch (error) {
      // 出现错误时仍然关闭窗口
      newWindow.destroy()
    }
  })

  newWindow.on('closed', () => {
    // 从窗口列表中移除
    const index = allWindows.indexOf(newWindow)
    if (index > -1) {
      allWindows.splice(index, 1)
    }
  })

  // 开发模式下的错误处理
  if (isDev) {
    newWindow.webContents.on('did-fail-load', () => {
      setTimeout(() => {
        if (newWindow && !newWindow.isDestroyed()) {
          newWindow.loadURL('http://localhost:5173')
        }
      }, 1000)
    })
  }
  
  // 添加到窗口列表
  allWindows.push(newWindow)
}

// 设置dock菜单（macOS）和系统托盘菜单
function setupDockMenu() {
  const isMac = process.platform === 'darwin'
  const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
  
  if (isMac) {
    // 设置macOS dock菜单 - 只保留新建窗口和退出选项
    const dockMenu = Menu.buildFromTemplate([
      {
        label: isZh ? '新建窗口' : 'New Window',
        click: () => {
          createNewWindow()
        }
      },
      {
        type: 'separator'
      },
      {
        label: isZh ? '退出' : 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
    
    app.dock.setMenu(dockMenu)
  } else {
    // 在Windows/Linux上设置系统托盘
    setupSystemTray()
  }
}

// 设置系统托盘（Windows/Linux）
function setupSystemTray() {
  // 暂时禁用系统托盘功能，用户可以通过菜单栏和快捷键使用新建窗口功能
  // 如果需要系统托盘，可以在有图标文件时启用此功能
  return
}

// 设置主题处理
function setupThemeHandling() {
  // 监听系统主题变化
  nativeTheme.on('updated', () => {
    // 向所有窗口发送主题变化事件
    allWindows.forEach(window => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('theme-changed', {
          shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
          themeSource: nativeTheme.themeSource
        })
      }
    })
  })
  
  // 初始主题设置
  allWindows.forEach(window => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('theme-changed', {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource
      })
    }
  })
}

// 处理主题相关的IPC
ipcMain.handle('get-theme', () => {
  return {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource
  }
})

ipcMain.handle('set-theme', (_, themeSource) => {
  nativeTheme.themeSource = themeSource
  return {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource
  }
})

// 移除重复的命令行参数 - 已在文件开头设置


app.whenReady().then(() => {
  createWindow()
  if (process.platform === 'darwin') {
    setupDockMenu()
  }
  setupThemeHandling()
})

// 应用退出前检查所有窗口的未保存更改
app.on('before-quit', async (event) => {
  if (allWindows.length === 0) {
    return
  }
  
  try {
    // 检查所有窗口是否有未保存更改
    const windowsWithUnsavedChanges: BrowserWindow[] = []
    
    for (const window of allWindows) {
      if (window && !window.isDestroyed()) {
        try {
          const hasUnsavedChanges = await window.webContents.executeJavaScript(`
            window.__hasUnsavedChanges || false
          `)
          if (hasUnsavedChanges) {
            windowsWithUnsavedChanges.push(window)
          }
        } catch (error) {
          // 忽略单个窗口的错误，继续检查其他窗口
        }
      }
    }
    
    if (windowsWithUnsavedChanges.length > 0) {
      // 有未保存更改时才阻止默认退出行为
      event.preventDefault()
      // 根据系统语言选择对话框文本
      const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
      
      const dialogOptions = isZh ? {
        type: 'warning' as const,
        buttons: ['保存全部并退出', '不保存直接退出', '取消'],
        defaultId: 0,
        cancelId: 2,
        title: '确认退出',
        message: `有 ${windowsWithUnsavedChanges.length} 个窗口有未保存的更改`,
        detail: '是否保存所有更改后再退出应用？'
      } : {
        type: 'warning' as const,
        buttons: ['Save All and Quit', "Don't Save and Quit", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Confirm Quit',
        message: `${windowsWithUnsavedChanges.length} window(s) have unsaved changes`,
        detail: 'Do you want to save all changes before quitting?'
      }
      
      // 使用主窗口或第一个可用窗口显示对话框
      const dialogWindow = mainWindow || allWindows[0]
      if (!dialogWindow || dialogWindow.isDestroyed()) {
        isQuitting = true
        app.quit()
        return
      }
      
      // 显示确认对话框
      const choice = await showAppDialog(dialogWindow, dialogOptions)
      
      if (choice.response === 0) {
        // 保存全部并退出
        let pendingSaves = windowsWithUnsavedChanges.length
        

        
        // 发送保存请求到所有有未保存更改的窗口
        windowsWithUnsavedChanges.forEach(async (window, index) => {
          if (window && !window.isDestroyed()) {
            try {
              // 获取窗口内容
              const content = await window.webContents.executeJavaScript(`
                window.markdownContentRef ? window.markdownContentRef.current : ''
              `)
              
              // 获取当前文件路径
              const currentPath = await window.webContents.executeJavaScript(`
                window.currentFilePathRef ? window.currentFilePathRef.current : null
              `)
              
              let saveFilePath = currentPath
              
              // 如果是新文件，生成默认文件名
              if (!saveFilePath) {
                const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
                const time = new Date().toTimeString().slice(0, 5).replace(':', '-') // HH-MM
                saveFilePath = `untitled-${date}-${time}.md`
                
                // 显示保存对话框让用户选择位置
                const result = await dialog.showSaveDialog(window, {
                  defaultPath: saveFilePath,
                  filters: [
                    { name: 'Markdown Files', extensions: ['md'] },
                    { name: 'All Files', extensions: ['*'] }
                  ]
                })
                
                if (result.canceled || !result.filePath) {
                  // 用户取消了保存，但我们已经在退出流程中，继续退出
                  pendingSaves--
                  if (pendingSaves === 0) {
                    isQuitting = true
                    app.quit()
                  }
                  return
                }
                
                saveFilePath = result.filePath
              }
              
              // 保存文件
              await fs.promises.writeFile(saveFilePath, content, 'utf-8')
              
              // 通知渲染进程更新文件路径和未保存状态
              window.webContents.send('file-saved', saveFilePath)
              
              // 完成一个保存
              pendingSaves--
              if (pendingSaves === 0) {
                isQuitting = true
                app.quit()
              }
              
            } catch (error) {
              // 保存失败，仍然继续退出流程
              pendingSaves--
              if (pendingSaves === 0) {
                isQuitting = true
                app.quit()
              }
            }
          }
        })
        
        // 设置超时保护，防止永远等待
        setTimeout(() => {
          isQuitting = true
          app.quit()
        }, 10000) // 给保存操作10秒时间
      } else if (choice.response === 1) {
        // 不保存，直接退出
        isQuitting = true
        app.quit()
      } else {
        // 如果选择取消 (response === 2)，重置退出标志，保持应用运行
        isQuitting = false
      }
    }
    // 如果没有未保存更改，让默认退出行为继续（不需要手动调用app.quit()）
  } catch (error) {
    // 出现错误时仍然退出应用
    isQuitting = true
    app.quit()
  }
})

app.on('window-all-closed', () => {
  // 如果是通过quit命令退出，或者不是macOS，则退出应用
  if (isQuitting || process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在macOS上，当dock图标被点击时的行为
  if (allWindows.length === 0) {
    // 没有窗口时，创建新窗口
    createWindow()
  } else {
    // 有窗口时，聚焦到最新的窗口
    const lastWindow = allWindows[allWindows.length - 1]
    if (lastWindow && !lastWindow.isDestroyed()) {
      if (lastWindow.isMinimized()) lastWindow.restore()
      lastWindow.focus()
    }
  }
})

// 创建应用菜单
function createMenu() {
  const isMac = process.platform === 'darwin'
  // 根据系统语言选择菜单文本
  const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
  
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
        { role: 'quit' }
      ]
    }] : []),
    
    // File菜单
    {
      label: isZh ? '文件' : 'File',
      submenu: [
        {
          label: isZh ? '新建文件' : 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-new-file')
            }
          }
        },
        {
          label: isZh ? '打开文件' : 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-open-file')
            }
          }
        },
        { type: 'separator' },
        {
          label: isZh ? '保存' : 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-save-file')
            }
          }
        },
        {
          label: isZh ? '另存为...' : 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-save-as-file')
            }
          }
        },
        { type: 'separator' },
        {
          label: isZh ? '导出PDF' : 'Export PDF',
          submenu: [
            {
              label: isZh ? '默认主题' : 'Default Theme',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (mainWindow) {
                  mainWindow.webContents.send('menu-export-pdf', 'default')
                }
              }
            },
            {
              label: isZh ? '学术主题' : 'Academic Theme',
              accelerator: 'CmdOrCtrl+Shift+E',
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('menu-export-pdf', 'academic')
                }
              }
            }
          ]
        },
        { type: 'separator' },
        ...(isMac ? [] : [{
          label: isZh ? '退出' : 'Quit',
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
      label: isZh ? '编辑' : 'Edit',
      submenu: [
        { role: 'undo', label: isZh ? '撤销' : undefined },
        { role: 'redo', label: isZh ? '重做' : undefined },
        { type: 'separator' },
        { role: 'cut', label: isZh ? '剪切' : undefined },
        { role: 'copy', label: isZh ? '复制' : undefined },
        { role: 'paste', label: isZh ? '粘贴' : undefined },
        { role: 'selectall', label: isZh ? '全选' : undefined },
        { type: 'separator' },
        {
          label: isZh ? '查找' : 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-find')
            }
          }
        },
        {
          label: isZh ? '替换' : 'Replace',
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
      label: isZh ? '视图' : 'View',
      submenu: [
        {
          label: isZh ? '切换预览' : 'Toggle Preview',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-toggle-preview')
            }
          }
        },
        {
          label: isZh ? '重置布局' : 'Reset Layout',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-reset-layout')
            }
          }
        },
        { type: 'separator' },
        { role: 'reload', label: isZh ? '重新加载' : undefined },
        { role: 'forcereload', label: isZh ? '强制重新加载' : undefined },
        { role: 'toggledevtools', label: isZh ? '切换开发者工具' : undefined },
        { type: 'separator' },
        { role: 'resetzoom', label: isZh ? '重置缩放' : undefined },
        { role: 'zoomin', label: isZh ? '放大' : undefined },
        { role: 'zoomout', label: isZh ? '缩小' : undefined },
        { type: 'separator' },
        { role: 'togglefullscreen', label: isZh ? '切换全屏' : undefined }
      ]
    },
    
    // Window菜单
    {
      label: isZh ? '窗口' : 'Window',
      submenu: [
        { role: 'minimize', label: isZh ? '最小化' : undefined },
        { role: 'zoom', label: isZh ? '缩放' : undefined },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: isZh ? '前置' : undefined }
        ] : [
          { role: 'close', label: isZh ? '关闭' : undefined }
        ])
      ]
    },
    
    // Help菜单
    {
      label: isZh ? '帮助' : 'Help',
      submenu: [
        {
          label: isZh ? '键盘快捷键' : 'Keyboard Shortcuts',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-shortcuts')
            }
          }
        },
        {
          label: isZh ? '关于 B-Markdown' : 'About B-Markdown',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-about')
            }
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 处理文件打开
ipcMain.handle('open-file', async () => {
  if (!mainWindow) return { success: false, error: 'No main window available' }

  try {
    // 根据系统语言选择对话框文本
    const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')

  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
        { name: isZh ? 'Markdown 文件' : 'Markdown Files', extensions: ['md', 'markdown', 'txt'] },
        { name: isZh ? '所有文件' : 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || !result.filePaths.length) {
      const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
      return { success: false, error: isZh ? '未选择文件' : 'No file selected' }
    }

    const filePath = result.filePaths[0]
      const content = await fs.promises.readFile(filePath, 'utf-8')

    return { success: true, content, filePath }
    } catch (error) {
    // 错误处理，但不输出到控制台
    const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
    return { success: false, error: error instanceof Error ? error.message : (isZh ? '未知错误' : 'Unknown error') }
    }
})

// 处理文件保存
ipcMain.handle('save-file', async (_, content: string, filePath?: string) => {
  if (!mainWindow) return false

  try {
    let saveFilePath = filePath

    if (!saveFilePath) {
      // 根据系统语言选择对话框文本
      const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
      
      // 如果没有文件路径，显示保存对话框
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: isZh ? 'Markdown 文件' : 'Markdown Files', extensions: ['md'] },
          { name: isZh ? '所有文件' : 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return false // 保存取消，返回false
      }

      saveFilePath = result.filePath
    }

    await fs.promises.writeFile(saveFilePath, content, 'utf-8')
    
    // 如果是新文件（没有原始filePath），返回文件路径；否则返回true
    if (!filePath) {
      return saveFilePath // 新文件保存，返回文件路径
    } else {
      return true // 现有文件保存，返回true
    }
  } catch (error) {
    // 错误处理，但不输出到控制台
    return false // 保存失败，返回false
  }
})

// 处理另存为
ipcMain.handle('save-as-file', async (_, content: string, currentFilePath?: string) => {
  if (!mainWindow) return { success: false, error: 'No main window available' }

  try {
    // 获取默认文件名
    let defaultFileName = 'untitled.md'
    if (currentFilePath) {
      defaultFileName = currentFilePath.split('/').pop() || defaultFileName
    }

    // 根据系统语言选择对话框文本
    const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFileName,
      filters: [
        { name: isZh ? 'Markdown 文件' : 'Markdown Files', extensions: ['md'] },
        { name: isZh ? '所有文件' : 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Save canceled' }
    }

      await fs.promises.writeFile(result.filePath, content, 'utf-8')
      return { success: true, filePath: result.filePath }
  } catch (error) {
    // 错误处理，但不输出到控制台
    const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
    return { success: false, error: error instanceof Error ? error.message : (isZh ? '未知错误' : 'Unknown error') }
  }
})

// 处理打开外部链接
ipcMain.handle('open-external', async (_, url: string) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
    return { success: false, error: error instanceof Error ? error.message : (isZh ? '未知错误' : 'Unknown error') }
  }
})

// 处理未保存更改对话框
ipcMain.handle('show-unsaved-changes-dialog', async (_, action: string) => {
  if (!mainWindow) return 2 // 返回取消

  try {
    // 根据系统语言选择对话框文本
    const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
    
    // 根据action类型获取对应的翻译文本
    const getActionText = (actionType: string, isZhinese: boolean): string => {
      const actionMap = {
        'newFile': isZhinese ? '新建文件' : 'creating a new file',
        'openFile': isZhinese ? '打开文件' : 'opening a file'
      }
      return actionMap[actionType as keyof typeof actionMap] || actionType
    }
    
    const actionText = getActionText(action, isZh)
    
    const dialogOptions = isZh ? {
      type: 'warning' as const,
      buttons: ['保存', '不保存', '取消'],
      defaultId: 0,
      cancelId: 2,
      title: '未保存的更改',
      message: '文档有未保存的更改',
      detail: `是否保存更改后再${actionText}？`
    } : {
      type: 'warning' as const,
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved Changes',
      message: 'The document has unsaved changes',
      detail: `Do you want to save the changes before ${actionText}?`
    }
    
    const choice = await showAppDialog(mainWindow, dialogOptions)
    return choice.response
  } catch (error) {
    // 错误处理，但不输出到控制台
    return 2 // 返回取消
  }
})

// 处理成功对话框显示
ipcMain.handle('show-success-dialog', async (_, options) => {
  if (!mainWindow) return
  
  try {
    // 根据系统语言选择对话框文本
    const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
    
    await showAppDialog(mainWindow, {
      type: 'info',
      title: options.title || (isZh ? '成功' : 'Success'),
      message: options.message || (isZh ? '操作成功完成' : 'Operation completed successfully')
    })
  } catch (error) {
    // 错误处理，但不输出到控制台
  }
})

// 处理PDF导出
ipcMain.handle('export-pdf', async (_, htmlContent: string, currentFileName?: string, theme: string = 'default', filePath?: string) => {
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
        const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
        return { success: false, error: isZh ? '保存已取消' : 'Save canceled' }
      }
      
      savePath = result.filePath
    }

    // 获取国际化文本
    const i18n = getI18nTexts()

    // 只有在用户确认保存位置后才开始显示进度
    sendProgress(10, i18n.pdfProgress.preparing)
    sendProgress(20, i18n.pdfProgress.creatingWindow)

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

    sendProgress(30, i18n.pdfProgress.generatingContent)

    // 生成PDF专用的HTML内容
    const pdfHTML = generatePDFHTML(htmlContent, theme)
    
    sendProgress(40, i18n.pdfProgress.loadingContent)
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pdfHTML)}`)
    
    sendProgress(60, i18n.pdfProgress.waitingFonts)
    // 等待页面加载完成，包括emoji字体加载
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    sendProgress(70, i18n.pdfProgress.preparingRender)
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
          }, 500);
        };
        
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setTimeout(forceRender, 200);
          });
        } else {
          setTimeout(forceRender, 1000);
        }
      })
    `)
    
    sendProgress(80, i18n.pdfProgress.generatingFile)
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

    sendProgress(90, i18n.pdfProgress.savingFile)
    // 保存PDF文件
    await fs.promises.writeFile(savePath, pdfData)
    
    // 关闭PDF窗口
    pdfWindow.close()
    
    sendProgress(100, i18n.pdfProgress.completed)
    
    return { success: true, filePath: savePath }
    
  } catch (error) {
    const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
    return { success: false, error: error instanceof Error ? error.message : (isZh ? '未知错误' : 'Unknown error') }
  }
})

// 获取国际化文本 (主进程版本)
function getI18nTexts() {
  const isZh = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
  
  if (isZh) {
    return {
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
      pdfExportSuccess: 'PDF已成功导出到：'
    }
  } else {
    return {
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
      pdfExportSuccess: 'PDF successfully exported to:'
    }
  }
}

// 生成PDF专用的HTML内容
function generatePDFHTML(htmlContent: string, theme: string = 'default'): string {
  const themeStyles = generateThemeStyles(theme)
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Export</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <!-- 加载KaTeX字体文件 -->
    <link rel="preload" href="/KaTeX_Main-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/KaTeX_Size1-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/KaTeX_Size2-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/KaTeX_Size3-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/KaTeX_Size4-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">
    <style>
        /* 确保emoji渲染的基础设置 */
        * {
            font-synthesis: none;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        ${themeStyles}
    </style>
</head>
<body>
    <div class="markdown-body">${htmlContent}</div>
</body>
</html>
  `
}

// 生成主题特定的样式
function generateThemeStyles(theme: string): string {
  // 共同的基础样式（KaTeX字体、emoji等）
  const baseStyles = `
        /* 确保KaTeX字体优先加载和使用 */
        @font-face {
            font-family: "KaTeX_Main";
            src: url("/KaTeX_Main-Regular.woff2") format("woff2"),
                 url("/KaTeX_Main-Regular.woff") format("woff"),
                 url("/KaTeX_Main-Regular.ttf") format("truetype");
            font-weight: normal;
            font-style: normal;
            font-display: block;
        }
        
        @font-face {
            font-family: "KaTeX_Size1";
            src: url("/KaTeX_Size1-Regular.woff2") format("woff2"),
                 url("/KaTeX_Size1-Regular.woff") format("woff"),
                 url("/KaTeX_Size1-Regular.ttf") format("truetype");
            font-weight: normal;
            font-style: normal;
            font-display: block;
        }
        
        @font-face {
            font-family: "KaTeX_Size2";
            src: url("/KaTeX_Size2-Regular.woff2") format("woff2"),
                 url("/KaTeX_Size2-Regular.woff") format("woff"),
                 url("/KaTeX_Size2-Regular.ttf") format("truetype");
            font-weight: normal;
            font-style: normal;
            font-display: block;
        }
        
        @font-face {
            font-family: "KaTeX_Size3";
            src: url("/KaTeX_Size3-Regular.woff2") format("woff2"),
                 url("/KaTeX_Size3-Regular.woff") format("woff"),
                 url("/KaTeX_Size3-Regular.ttf") format("truetype");
            font-weight: normal;
            font-style: normal;
            font-display: block;
        }
        
        @font-face {
            font-family: "KaTeX_Size4";
            src: url("/KaTeX_Size4-Regular.woff2") format("woff2"),
                 url("/KaTeX_Size4-Regular.woff") format("woff"),
                 url("/KaTeX_Size4-Regular.ttf") format("truetype");
            font-weight: normal;
            font-style: normal;
            font-display: block;
        }

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

        /* 直接使用系统emoji字体，不定义@font-face */
        
        /* 数学公式样式 - 通用于所有主题 */
        .katex, .katex * {
            font-family: "KaTeX_Main" !important;
            font-synthesis: none !important;
            font-display: block !important;
        }
        
        /* KaTeX数学符号 */
        .katex .mord, .katex .mop {
            font-family: "KaTeX_Main", "Computer Modern", "Latin Modern Math" !important;
        }
        
        /* KaTeX括号和分隔符 */
        .katex .mopen, .katex .mclose {
            font-family: "KaTeX_Size1" !important;
        }
        
        /* KaTeX大型分隔符 */
        .katex .delimsizing.size1, .katex .delimsizinginner.size1 {
            font-family: "KaTeX_Size1" !important;
        }
        .katex .delimsizing.size2, .katex .delimsizinginner.size2 {
            font-family: "KaTeX_Size2" !important;
        }
        .katex .delimsizing.size3, .katex .delimsizinginner.size3 {
            font-family: "KaTeX_Size3" !important;
        }
        .katex .delimsizing.size4, .katex .delimsizinginner.size4 {
            font-family: "KaTeX_Size4" !important;
        }
        
        /* KaTeX其他大小相关元素 */
        .katex .delimsizing, .katex .delimsizinginner,
        .katex .sizing, .katex .fontsize-ensurer {
            font-family: "KaTeX_Size1" !important;
        }
        
        /* 矩阵环境的特殊括号 */
        .katex .pmatrix .mopen, .katex .pmatrix .mclose,
        .katex .bmatrix .mopen, .katex .bmatrix .mclose,
        .katex .vmatrix .mopen, .katex .vmatrix .mclose,
        .katex .Vmatrix .mopen, .katex .Vmatrix .mclose {
            font-family: "KaTeX_Size1" !important;
        }
        
        /* 基于data-char属性的精确控制 */
        [data-char="("], [data-char=")"], [data-char="["], [data-char="]"],
        [data-char="{"], [data-char="}"], [data-char="⟨"], [data-char="⟩"],
        [data-char="|"], [data-char="‖"] {
            font-family: "KaTeX_Size1" !important;
        }
        
        /* 通用换行设置 */
        * {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            box-sizing: border-box;
        }
        
        /* 优化emoji和文字渲染 */
        *:not(.katex):not(.katex *):not(code):not(pre):not(tt) {
            font-feature-settings: "liga" 1, "kern" 1, "clig" 1;
            -webkit-font-feature-settings: "liga" 1, "kern" 1, "clig" 1;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* 全局代码和表格优化 */
        code, pre, tt {
            -webkit-font-smoothing: auto;
            -moz-osx-font-smoothing: auto;
            text-rendering: optimizeSpeed;
            font-variant-ligatures: none;
        }
        
        table {
            page-break-inside: avoid;
            border-spacing: 0;
        }
        
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        
        th, td {
            page-break-inside: avoid;
        }
        
        pre {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* 确保长行能够正确处理 */
        .markdown-body {
            overflow-wrap: break-word;
            word-wrap: break-word;
            hyphens: auto;
        }
        
        /* 全局图片基础样式 - 适用于所有主题 */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
            box-sizing: border-box;
        }
        
        /* PDF打印专用的全局图片优化 */
        @media print {
            img {
                max-width: 100% !important;
                height: auto !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            
            /* 确保图片容器也不会分页 */
            figure, .image-container, p:has(img) {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
        }
  `
  
  if (theme === 'academic') {
    return baseStyles + `
        /* 学术论文标准字体样式 - 符合中英文学术规范 */
        body {
            font-family: "Times New Roman", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif;
            font-size: 12pt; /* 学术标准：12pt正文 */
            line-height: 1.5; /* 学术标准：1.5倍行距 */
            color: #000; /* 纯黑色，更适合学术论文 */
            max-width: 800px;
            margin: 0 auto;
            padding: 2.5cm; /* 学术标准页边距 */
            background: white;
            text-align: justify; /* 学术论文的两端对齐 */
            text-indent: 0; /* 无首行缩进 */
        }
        
        /* 学术论文标题层次 */
        h1, h2, h3, h4, h5, h6 {
            color: #000;
            font-family: "Times New Roman", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif;
            margin: 18pt 0 12pt; /* 学术标准标题间距 */
            line-height: 1.2; /* 紧凑的标题行距 */
            text-align: left;
        }
        
        h1 {
            font-size: 18pt; /* 一级标题：18pt */
            font-weight: bold;
            margin: 24pt 0 15pt; /* 一级标题更大间距 */
            text-align: center; /* 主标题居中 */
        }
        
        h2 {
            font-size: 16pt; /* 二级标题：16pt */
            font-weight: bold;
            margin: 20pt 0 12pt;
            border-bottom: none; /* 移除下划线 */
        }
        
        h3 {
            font-size: 14pt; /* 三级标题：14pt */
            font-weight: bold;
            margin: 16pt 0 10pt;
        }
        
        h4, h5, h6 {
            font-size: 12pt; /* 四级及以下标题：12pt */
            font-weight: bold;
            margin: 14pt 0 8pt;
        }
        
        /* 学术论文段落和间距 */
        p {
            margin: 12pt 0; /* 学术标准段落间距 */
            text-indent: 0; /* 无首行缩进 */
        }
        
        /* 学术论文列表和引用 */
        blockquote, ul, ol, dl, table, pre {
            margin: 12pt 0; /* 统一的学术间距 */
        }
        
        li {
            margin: 6pt 0; /* 列表项间距 */
        }
        
        /* 学术论文代码样式 */
        code, tt {
            font-family: "Courier New", "Monaco", "Menlo", "Consolas", monospace;
            font-size: 9pt; /* 学术论文代码字体稍小一些 */
            background-color: #f8f8f8;
            padding: 2pt 4pt;
            border-radius: 2pt;
            border: 1px solid #e0e0e0;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            hyphens: auto;
            word-break: break-all;
        }
        
        pre {
            font-family: "Courier New", "Monaco", "Menlo", "Consolas", monospace !important;
            font-size: 9pt !important; /* 学术论文代码块字体 */
            line-height: 1.4 !important; /* 代码块行距适中 */
            background-color: #f8f8f8;
            border: 1px solid #cccccc;
            padding: 10pt 12pt; /* 学术标准内边距 */
            margin: 12pt 0;
            border-radius: 3pt;
            overflow: visible !important;
            white-space: pre-wrap !important; /* 自动换行 */
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-all !important;
            max-width: 100%;
            box-sizing: border-box;
            display: block;
            unicode-bidi: embed;
            font-variant-ligatures: none;
            font-feature-settings: normal;
        }
        
        pre code {
            background-color: transparent !important;
            border: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-all !important;
            font-family: inherit !important;
            font-size: inherit !important;
            display: block;
            max-width: 100%;
        }
        
        /* 学术论文三线表样式 */
        table {
            border-collapse: collapse;
            margin: 12pt auto; /* 表格居中 */
            width: 100%;
            max-width: 100%;
            table-layout: auto;
            font-size: 10pt; /* 表格内容稍小 */
            border-top: 2px solid #000; /* 顶部粗线 */
            border-bottom: 2px solid #000; /* 底部粗线 */
            border-left: none; /* 左侧无边框 */
            border-right: none; /* 右侧无边框 */
        }
        
        th, td {
            border-left: none; /* 左侧无边框 */
            border-right: none; /* 右侧无边框 */
            border-top: none;
            border-bottom: none;
            padding: 6pt 8pt;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            max-width: 200pt; /* 限制单元格最大宽度 */
        }
        
        /* 表头样式 */
        th {
            background-color: transparent; /* 三线表不使用背景色 */
            font-weight: bold;
            font-size: 10pt;
            border-bottom: 1px solid #000; /* 表头下方细线 */
        }
        
        td {
            font-size: 10pt;
        }
        
        /* 最后一行不需要底边框，因为table已经有了 */
        tr:last-child td {
            border-bottom: none;
        }
        
        /* 学术论文链接样式 */
        a {
            color: #000; /* 学术论文链接黑色 */
            text-decoration: underline;
        }
        
        /* 学术论文图片样式 */
        img {
            max-width: 100% !important;
            max-height: 20cm; /* 防止图片过大 */
            height: auto !important;
            width: auto !important;
            display: block;
            margin: 12pt auto; /* 图片居中显示 */
            page-break-inside: avoid; /* 避免图片被分页切断 */
            break-inside: avoid;
            object-fit: contain; /* 确保图片比例不变 */
            object-position: center;
            box-sizing: border-box;
        }
        
        /* 学术论文分隔线样式 */
        hr {
            height: 1pt;
            margin: 18pt 0;
            background-color: #000;
            border: 0;
            page-break-inside: avoid;
        }
        
        /* 学术论文打印优化 */
        @media print {
            body {
                font-family: "Times New Roman", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif !important;
                font-size: 12pt !important;
                line-height: 1.5 !important;
                color: #000 !important;
                padding: 2.5cm !important;
                text-align: justify !important;
            }
            
            h1, h2, h3, h4, h5, h6 { 
                font-family: "Times New Roman", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif !important;
            }
            
            h1 { font-size: 18pt !important; margin: 24pt 0 15pt !important; text-align: center !important; }
            h2 { font-size: 16pt !important; margin: 20pt 0 12pt !important; border-bottom: none !important; }
            h3 { font-size: 14pt !important; margin: 16pt 0 10pt !important; }
            h4, h5, h6 { font-size: 12pt !important; margin: 14pt 0 8pt !important; }
            
            p, blockquote, ul, ol, dl, table, pre { margin: 12pt 0 !important; }
            li { margin: 6pt 0 !important; }
            
            code, tt { 
                font-family: "Courier New", "Monaco", "Menlo", "Consolas", monospace !important;
                font-size: 9pt !important; 
                padding: 2pt 4pt !important; 
                background-color: #f8f8f8 !important;
                border: 1px solid #e0e0e0 !important;
                border-radius: 2pt !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                hyphens: auto !important;
                word-break: break-all !important;
            }
            pre { 
                font-family: "Courier New", "Monaco", "Menlo", "Consolas", monospace !important;
                font-size: 9pt !important; 
                line-height: 1.4 !important; 
                padding: 10pt 12pt !important; 
                margin: 12pt 0 !important;
                background-color: #f8f8f8 !important;
                border: 1px solid #cccccc !important;
                border-radius: 3pt !important;
                overflow: visible !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-all !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                display: block !important;
                unicode-bidi: embed !important;
                font-variant-ligatures: none !important;
                font-feature-settings: normal !important;
            }
            
            pre code {
                background-color: transparent !important;
                border: none !important;
                padding: 0 !important;
                border-radius: 0 !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-all !important;
                font-family: inherit !important;
                font-size: inherit !important;
                display: block !important;
                max-width: 100% !important;
            }
            
            table {
                border-collapse: collapse !important;
                margin: 12pt auto !important;
                width: 100% !important;
                max-width: 100% !important;
                font-size: 10pt !important;
                border-top: 2px solid #000 !important;
                border-bottom: 2px solid #000 !important;
                border-left: none !important;
                border-right: none !important;
            }
            
            th, td {
                border-left: none !important;
                border-right: none !important;
                border-top: none !important;
                border-bottom: none !important;
                padding: 6pt 8pt !important;
                text-align: left !important;
                vertical-align: top !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                hyphens: auto !important;
                max-width: 200pt !important;
                font-size: 10pt !important;
            }
            
            th {
                background-color: transparent !important;
                font-weight: bold !important;
                border-bottom: 1px solid #000 !important;
            }
            
            tr:last-child td {
                border-bottom: none !important;
            }
            
            /* 学术论文图片打印样式 */
            img {
                max-width: 100% !important;
                max-height: 20cm !important; /* A4纸张高度约29.7cm，留出边距后约20cm可用 */
                height: auto !important;
                width: auto !important;
                display: block !important;
                margin: 12pt auto !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                object-fit: contain !important;
                object-position: center !important;
                /* 确保图片不会超出PDF页面边界 */
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                /* 防止图片拉伸变形 */
                image-rendering: auto !important;
                image-rendering: -webkit-optimize-contrast !important;
            }
            
            /* 学术论文分隔线打印样式 */
            hr {
                height: 1pt !important;
                margin: 18pt 0 !important;
                background-color: #000 !important;
                border: 0 !important;
                page-break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
            }
        }
    `
  } else {
    // default主题 - 原来的通用样式
    return baseStyles + `
        body {
            font-family: "Times New Roman", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            background: white;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #333;
            font-family: "Times New Roman", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif;
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: bold;
            line-height: 1.25;
        }
        
        h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 8px; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; color: #6a737d; }
        
        p {
            margin-bottom: 16px;
        }
        
        blockquote {
            padding: 0 16px;
            margin: 0 0 16px 0;
            color: #6a737d;
            border-left: 4px solid #dfe2e5;
        }
        
        ul, ol {
            padding-left: 2em;
            margin-bottom: 16px;
        }
        
        li {
            margin-bottom: 4px;
        }
        
        code {
            font-family: "Courier New", "Monaco", "Menlo", "Consolas", monospace;
            font-size: 85%;
            background-color: rgba(27,31,35,0.05);
            padding: 3px 6px;
            border-radius: 3px;
            border: 1px solid rgba(27,31,35,0.1);
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
            hyphens: auto;
            word-break: break-all;
            }
            
            pre {
            font-family: "Courier New", "Monaco", "Menlo", "Consolas", monospace !important;
            font-size: 13px !important;
            line-height: 1.45 !important;
            background-color: #f6f8fa;
            border-radius: 6px;
            border: 1px solid #e1e4e8;
            padding: 16px;
            margin-bottom: 16px;
            overflow: visible !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-all !important;
            max-width: 100%;
            box-sizing: border-box;
            display: block;
            unicode-bidi: embed;
            font-variant-ligatures: none;
            font-feature-settings: normal;
        }
        
        pre code {
            background-color: transparent !important;
            border: 0 !important;
            display: block;
            line-height: inherit;
            margin: 0;
            max-width: 100%;
            overflow: visible;
            padding: 0 !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-all !important;
            font-family: inherit !important;
            font-size: inherit !important;
        }
        
        table {
            border-collapse: collapse;
            margin-bottom: 16px;
            width: 100%;
            max-width: 100%;
            table-layout: auto;
            font-size: 14px;
        }
        
        th, td {
            border: 1px solid #dfe2e5;
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            max-width: 250px;
        }
        
        th {
            background-color: #f6f8fa;
            font-weight: bold;
            font-size: 14px;
        }
        
        td {
            font-size: 14px;
        }
        
        tr:nth-child(2n) {
            background-color: #f9f9f9;
        }
        
        a {
            color: #0366d6;
                text-decoration: none;
            }
            
        a:hover {
            text-decoration: underline;
        }
        
        img {
            max-width: 100% !important;
            max-height: 20cm; /* 防止图片过大 */
            height: auto !important;
            width: auto !important;
            display: block;
            margin: 16px auto; /* 图片居中显示 */
            page-break-inside: avoid; /* 避免图片被分页切断 */
            break-inside: avoid;
            object-fit: contain; /* 确保图片比例不变 */
            object-position: center;
            box-sizing: border-box;
        }
        
        hr {
            height: 2px;
            margin: 24px 0;
            background-color: #e1e4e8;
            border: 0;
            page-break-inside: avoid;
        }
        
        /* Default主题图片和分隔线打印样式 */
        @media print {
            img {
                max-width: 100% !important;
                max-height: 20cm !important; /* A4纸张高度约29.7cm，留出边距后约20cm可用 */
                height: auto !important;
                width: auto !important;
                display: block !important;
                margin: 16px auto !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                object-fit: contain !important;
                object-position: center !important;
                /* 确保图片不会超出PDF页面边界 */
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                /* 防止图片拉伸变形 */
                image-rendering: auto !important;
                image-rendering: -webkit-optimize-contrast !important;
            }
            
            hr {
                height: 1px !important;
                margin: 24px 0 !important;
                background-color: #e1e4e8 !important;
                border: 0 !important;
                page-break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
            }
        }
    `
  }
} 