const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

class WindowsRegistry {
  constructor() {
    this.appName = 'SmarterFolderLauncher'
    this.appPath = process.execPath
  }

  /**
   * 注册Windows右键菜单
   */
  async registerContextMenu() {
    if (process.platform !== 'win32') {
      return { success: false, message: '仅支持Windows系统' }
    }

    try {
      const regKey = 'HKEY_CLASSES_ROOT\\Directory\\shell\\SmarterFolderLauncher'
      const regKeyCommand = `${regKey}\\command`
      
      // 创建主键
      await this.runRegCommand('add', regKey, '/ve', '/d', '"添加到项目"', '/f')
      
      // 设置图标
      await this.runRegCommand('add', regKey, '/v', 'Icon', '/d', `"${this.appPath}"`, '/f')
      
      // 创建命令键
      await this.runRegCommand('add', regKeyCommand, '/ve', '/d', `"${this.appPath}" "%1"`, '/f')
      
      return { success: true, message: '右键菜单注册成功' }
    } catch (error) {
      console.error('注册右键菜单失败:', error)
      let errorMessage = '注册右键菜单失败'
      
      if (error.message.includes('拒绝访问') || error.message.includes('Access is denied')) {
        errorMessage = '注册失败：需要管理员权限。请以管理员身份运行应用程序。'
      } else if (error.message.includes('注册表操作失败')) {
        errorMessage = '注册表操作失败，请确保具有足够的系统权限。'
      }
      
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 卸载Windows右键菜单
   */
  async unregisterContextMenu() {
    if (process.platform !== 'win32') {
      return { success: false, message: '仅支持Windows系统' }
    }

    try {
      const regKey = 'HKEY_CLASSES_ROOT\\Directory\\shell\\SmarterFolderLauncher'
      await this.runRegCommand('delete', regKey, '/f')
      
      return { success: true, message: '右键菜单卸载成功' }
    } catch (error) {
      console.error('卸载右键菜单失败:', error)
      let errorMessage = '卸载右键菜单失败'
      
      if (error.message.includes('拒绝访问') || error.message.includes('Access is denied')) {
        errorMessage = '卸载失败：需要管理员权限。请以管理员身份运行应用程序。'
      } else if (error.message.includes('注册表操作失败')) {
        errorMessage = '注册表操作失败，请确保具有足够的系统权限。'
      } else if (error.message.includes('找不到指定的注册表项') || error.message.includes('cannot find')) {
        // 如果注册表项不存在，认为卸载成功
        return { success: true, message: '右键菜单已卸载（注册表项不存在）' }
      }
      
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 检查右键菜单是否已注册
   */
  async isContextMenuRegistered() {
    if (process.platform !== 'win32') {
      return { success: true, data: false }
    }

    try {
      const regKey = 'HKEY_CLASSES_ROOT\\Directory\\shell\\SmarterFolderLauncher'
      await this.runRegCommand('query', regKey)
      return { success: true, data: true }
    } catch (error) {
      return { success: true, data: false }
    }
  }

  /**
   * 执行注册表命令
   */
  runRegCommand(...args) {
    return new Promise((resolve, reject) => {
      const regProcess = spawn('reg', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      })

      let stdout = ''
      let stderr = ''

      regProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      regProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      regProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`注册表操作失败: ${stderr || stdout}`))
        }
      })

      regProcess.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * 处理命令行参数
   */
  static handleCommandLineArgs(argv) {
    // 检查是否有文件夹路径参数
    const args = argv.slice(2)
    if (args.length > 0 && args[0] !== '.' && !args[0].startsWith('--')) {
      return {
        isFromContextMenu: true,
        folderPath: args[0]
      }
    }
    return {
      isFromContextMenu: false,
      folderPath: null
    }
  }
}

module.exports = WindowsRegistry