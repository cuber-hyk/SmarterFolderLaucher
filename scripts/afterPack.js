const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

module.exports = async function afterPack(context) {
  console.log('开始处理原生模块...')
  
  const { electronPlatformName, arch, appOutDir } = context
  const resourcesPath = path.join(appOutDir, 'resources')
  const appPath = path.join(resourcesPath, 'app')
  
  // 检查是否存在 app.asar，如果存在则解压
  const asarPath = path.join(resourcesPath, 'app.asar')
  if (fs.existsSync(asarPath)) {
    console.log('检测到 app.asar，跳过原生模块处理（已打包）')
    return
  }
  
  // 如果是解压模式，重建原生模块
  if (fs.existsSync(appPath)) {
    console.log('重建原生模块 better-sqlite3...')
    try {
      execSync('npx electron-rebuild', {
        cwd: appPath,
        stdio: 'inherit',
        env: {
          ...process.env,
          npm_config_target: context.electronVersion,
          npm_config_arch: arch,
          npm_config_target_platform: electronPlatformName,
          npm_config_disturl: 'https://electronjs.org/headers',
          npm_config_runtime: 'electron',
          npm_config_cache: path.join(appPath, '.npm'),
          npm_config_build_from_source: 'true'
        }
      })
      console.log('原生模块重建完成')
    } catch (error) {
      console.error('原生模块重建失败:', error)
      throw error
    }
  }
}