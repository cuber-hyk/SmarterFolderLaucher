const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, shell, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const Database = require('../database/database')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

class SmarterFolderLauncher {
  constructor() {
    this.mainWindow = null
    this.tray = null
    this.database = null
    this.isQuitting = false
    this.currentHotkey = 'Alt+F'
    this.currentAddFolderHotkey = 'CommandOrControl+Alt+A'
  }

  async init() {
    console.log('SmarterFolderLauncher 开始初始化...')
    await this.initDatabase()
    console.log('数据库初始化完成，继续其他初始化...')
    this.createWindow()
    this.createTray()
    this.registerGlobalShortcuts()
    this.setupIpcHandlers()
    this.initAutoUpdater()
    console.log('SmarterFolderLauncher 初始化完成')
  }

  initAutoUpdater() {
    if (isDev) {
      console.log('开发环境，跳过自动更新检查')
      return
    }

    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('checking-for-update', () => {
      console.log('正在检查更新...')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('发现新版本:', info.version)
    })

    autoUpdater.on('update-not-available', (info) => {
      console.log('当前已是最新版本')
    })

    autoUpdater.on('error', (err) => {
      console.error('自动更新错误:', err)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "下载速度: " + progressObj.bytesPerSecond
      log_message = log_message + ' - 已下载 ' + progressObj.percent + '%'
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')'
      console.log(log_message)
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('更新下载完成，将在重启后安装')
      autoUpdater.quitAndInstall()
    })
  }

  async initDatabase() {
    try {
      this.database = new Database()
      await this.database.init()
      console.log('数据库初始化完成')
    } catch (error) {
      console.error('数据库初始化失败:', error)
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 500,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })

    // 加载页面
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000')
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'))
    }

    // 窗口事件
    this.mainWindow.on('blur', () => {
      if (!isDev) {
        setTimeout(() => {
          if (this.mainWindow && !this.mainWindow.isFocused()) {
            this.hideWindow()
          }
        }, 100)
      }
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    this.mainWindow.on('ready-to-show', () => {
      this.centerWindow()
      if (isDev) {
        this.showWindow()
      }
    })
  }

  createTray() {
    const iconPath = path.join(__dirname, '../../assets/icon.png')
    this.tray = new Tray(iconPath)
    
    this.tray.setToolTip('智能文件夹启动器')
    
    // 双击托盘图标显示窗口
    this.tray.on('double-click', () => {
      this.showWindow()
    })

    // Windows平台单击事件
    if (process.platform === 'win32') {
      let clickTimeout = null
      this.tray.on('click', () => {
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
          return
        }
        clickTimeout = setTimeout(() => {
          this.toggleWindow()
          clickTimeout = null
        }, 200)
      })
    }

    this.updateTrayMenu()
  }

  updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主界面',
        click: () => this.showWindow()
      },
      {
        label: '添加文件夹',
        click: () => this.addFolderFromTray()
      },
      { type: 'separator' },
      {
        label: '设置',
        click: () => this.openSettings()
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.isQuitting = true
          app.quit()
        }
      }
    ])
    
    this.tray.setContextMenu(contextMenu)
  }

  async registerGlobalShortcuts() {
    if (!app.isReady()) {
      console.log('应用未就绪，延迟注册快捷键')
      return
    }

    // 从数据库读取自定义快捷键设置
    if (this.database) {
      const addFolderHotkey = this.database.getSetting('hotkey_add_folder')
      if (addFolderHotkey) {
        this.currentAddFolderHotkey = addFolderHotkey
      }
    }

    // 注册全局快捷键
    let registered = globalShortcut.register(this.currentHotkey, () => {
      this.toggleWindow()
    })
    
    if (registered) {
      console.log(`全局快捷键注册成功: ${this.currentHotkey}`)
    } else {
      console.log(`全局快捷键 ${this.currentHotkey} 注册失败，尝试备用快捷键`)
      // 尝试备用快捷键
      const backupHotkey = 'CommandOrControl+Shift+F'
      registered = globalShortcut.register(backupHotkey, () => {
        this.toggleWindow()
      })
      
      if (registered) {
        console.log(`备用快捷键注册成功: ${backupHotkey}`)
        this.currentHotkey = backupHotkey
      } else {
        console.log('备用快捷键也注册失败')
      }
    }

    // 注册添加文件夹快捷键
    let addFolderRegistered = globalShortcut.register(this.currentAddFolderHotkey, () => {
      this.addFolderFromTray()
    })
    
    if (addFolderRegistered) {
      console.log(`添加文件夹快捷键注册成功: ${this.currentAddFolderHotkey}`)
    } else {
      console.log(`添加文件夹快捷键 ${this.currentAddFolderHotkey} 注册失败，尝试备用快捷键`)
      // 尝试备用快捷键
      const backupAddFolderHotkey = 'CommandOrControl+Shift+A'
      addFolderRegistered = globalShortcut.register(backupAddFolderHotkey, () => {
        this.addFolderFromTray()
      })
      
      if (addFolderRegistered) {
        console.log(`添加文件夹备用快捷键注册成功: ${backupAddFolderHotkey}`)
        this.currentAddFolderHotkey = backupAddFolderHotkey
      } else {
        console.log('添加文件夹备用快捷键也注册失败')
      }
    }
  }

  setupIpcHandlers() {
    // 窗口控制
    ipcMain.handle('close-window', () => {
      this.hideWindow()
    })

    ipcMain.handle('minimize-window', () => {
      if (this.mainWindow) {
        this.mainWindow.minimize()
      }
    })

    // 文件夹操作
    ipcMain.handle('get-folders', async () => {
      if (this.database) {
        return await this.database.getFolders()
      }
      return []
    })

    ipcMain.handle('add-folder', async (event, folderData) => {
      if (this.database) {
        return await this.database.addFolder(folderData)
      }
      return null
    })

    // 检查更新
    ipcMain.handle('check-for-updates', async () => {
      if (isDev) {
        return { success: false, message: '开发环境不支持更新检查' };
      }
      try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 下载并安装更新
    ipcMain.handle('download-update', async () => {
      if (isDev) {
        return { success: false, message: '开发环境不支持更新' };
      }
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 退出并安装更新
    ipcMain.handle('quit-and-install', () => {
      autoUpdater.quitAndInstall();
    });

    ipcMain.handle('update-folder', async (event, id, folderData) => {
      if (this.database) {
        return await this.database.updateFolder(id, folderData)
      }
      return false
    })

    ipcMain.handle('delete-folder', async (event, id) => {
      if (this.database) {
        return await this.database.deleteFolder(id)
      }
      return false
    })

    ipcMain.handle('open-folder', async (event, folderPath) => {
      try {
        await shell.openPath(folderPath)
        return true
      } catch (error) {
        console.error('打开文件夹失败:', error)
        return false
      }
    })

    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
      })
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    })

    // 设置相关
    ipcMain.handle('open-settings', () => {
      this.openSettings()
    })

    ipcMain.handle('update-hotkey', (event, newHotkey) => {
      return this.updateGlobalHotkey(newHotkey)
    })

    ipcMain.handle('get-settings', () => {
      if (this.database) {
        return this.database.getAllSettings()
      }
      return {}
    })

    ipcMain.handle('save-setting', (event, key, value) => {
      if (this.database) {
        return this.database.setSetting(key, value)
      }
      return false
    })

    ipcMain.handle('update-add-folder-hotkey', (event, newHotkey) => {
      return this.updateAddFolderHotkey(newHotkey)
    })

    ipcMain.handle('get-current-hotkeys', () => {
      return {
        toggleWindow: this.currentHotkey,
        addFolder: this.currentAddFolderHotkey
      }
    })
  }

  showWindow() {
    if (this.mainWindow) {
      this.centerWindow()
      this.mainWindow.show()
      this.mainWindow.focus()
      // 确保窗口在最前面
      this.mainWindow.setAlwaysOnTop(true)
      this.mainWindow.setAlwaysOnTop(false)
      this.mainWindow.setAlwaysOnTop(true)
    }
  }

  hideWindow() {
    if (this.mainWindow) {
      this.mainWindow.hide()
    }
  }

  toggleWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible()) {
        this.hideWindow()
      } else {
        this.showWindow()
      }
    }
  }

  centerWindow() {
    if (this.mainWindow) {
      this.mainWindow.center()
    }
  }

  async addFolderFromTray() {
    const folderPath = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    
    if (!folderPath.canceled && folderPath.filePaths.length > 0) {
      const path = folderPath.filePaths[0]
      const name = require('path').basename(path)
      
      if (this.database) {
        await this.database.addFolder({ name, path })
        console.log('文件夹添加成功:', name)
      }
    }
  }

  updateGlobalHotkey(newHotkey) {
    try {
      // 转换前端快捷键格式到Electron格式
      const electronHotkey = this.convertHotkeyFormat(newHotkey)
      
      // 先注销当前快捷键
      globalShortcut.unregister(this.currentHotkey)
      
      // 注册新快捷键
      const registered = globalShortcut.register(electronHotkey, () => {
        this.toggleWindow()
      })
      
      if (registered) {
        this.currentHotkey = electronHotkey
        console.log(`全局快捷键更新成功: ${electronHotkey}`)
        return { success: true, message: '快捷键更新成功' }
      } else {
        // 如果注册失败，恢复原快捷键
        globalShortcut.register(this.currentHotkey, () => {
          this.toggleWindow()
        })
        console.log('新快捷键注册失败，已恢复原快捷键')
        return { success: false, message: '快捷键已被占用或无效' }
      }
    } catch (error) {
      console.error('更新快捷键失败:', error)
      return { success: false, message: '快捷键格式无效' }
    }
  }

  updateAddFolderHotkey(newHotkey) {
    try {
      // 转换前端快捷键格式到Electron格式
      const electronHotkey = this.convertHotkeyFormat(newHotkey)
      
      // 先注销当前添加文件夹快捷键
      globalShortcut.unregister(this.currentAddFolderHotkey)
      
      // 注册新的添加文件夹快捷键
      const registered = globalShortcut.register(electronHotkey, () => {
        this.addFolderFromTray()
      })
      
      if (registered) {
        this.currentAddFolderHotkey = electronHotkey
        console.log(`添加文件夹快捷键更新成功: ${electronHotkey}`)
        
        // 保存到数据库
        if (this.database) {
          this.database.setSetting('hotkey_add_folder', electronHotkey)
        }
        
        return { success: true, message: '添加文件夹快捷键更新成功' }
      } else {
        // 如果注册失败，恢复原快捷键
        globalShortcut.register(this.currentAddFolderHotkey, () => {
          this.addFolderFromTray()
        })
        console.log('新的添加文件夹快捷键注册失败，已恢复原快捷键')
        return { success: false, message: '快捷键已被占用或无效' }
      }
    } catch (error) {
      console.error('更新添加文件夹快捷键失败:', error)
      return { success: false, message: '快捷键格式无效' }
    }
  }

  convertHotkeyFormat(hotkey) {
    // 将前端格式 (Ctrl+Alt+F) 转换为 Electron 格式 (CommandOrControl+Alt+F)
    return hotkey.replace(/Ctrl/g, 'CommandOrControl')
  }

  openSettings() {
    console.log('打开设置')
    // 显示主窗口并发送设置事件
    this.showWindow()
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('open-settings-page')
    }
  }
}

// 应用事件处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  globalShortcut.unregisterAll()
})

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let launcherInstance = null
  
  app.whenReady().then(async () => {
    launcherInstance = new SmarterFolderLauncher()
    await launcherInstance.init()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        launcherInstance.createWindow()
      }
    })
  })
  
  app.on('second-instance', () => {
    // 当运行第二个实例时，将会聚焦到主窗口
    if (launcherInstance && launcherInstance.mainWindow) {
      if (launcherInstance.mainWindow.isMinimized()) launcherInstance.mainWindow.restore()
      launcherInstance.mainWindow.focus()
      launcherInstance.showWindow()
    }
  })
}

// 在文件开头添加
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason)
})
// 修改数据库引用
try {
  const Database = require(path.join(__dirname, '../database/database'))
} catch (error) {
  console.error('加载数据库模块失败:', error)
  // 可以考虑使用备用方案或退出应用
}