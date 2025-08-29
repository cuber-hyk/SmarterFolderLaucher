const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

class DatabaseManager {
  constructor() {
    this.db = null
    this.dbPath = path.join(app.getPath('userData'), 'folders.db')
  }

  async init() {
    try {
      console.log('开始初始化数据库...')
      console.log('数据库路径:', this.dbPath)
      
      // 确保数据目录存在
      const dbDir = path.dirname(this.dbPath)
      console.log('数据库目录:', dbDir)
      
      if (!fs.existsSync(dbDir)) {
        console.log('创建数据库目录...')
        fs.mkdirSync(dbDir, { recursive: true })
      }

      console.log('创建数据库连接...')
      this.db = new Database(this.dbPath)
      console.log('数据库连接成功')
      
      this.createTables()
      console.log('数据库初始化完成')
      return true
    } catch (err) {
      console.error('数据库连接失败:', err)
      console.error('错误详情:', err.message)
      console.error('错误堆栈:', err.stack)
      this.db = null
      throw err
    }
  }

  createTables() {
    try {
      const foldersSql = `
        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          icon TEXT,
          color TEXT DEFAULT '#007acc',
          pinyin TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      const settingsSql = `
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      this.db.exec(foldersSql)
      this.db.exec(settingsSql)
      console.log('数据表创建成功')
      
      // 初始化默认设置
      this.initDefaultSettings()
      
      // 检查并添加缺失的列（用于数据库迁移）
      this.migrateDatabase()
    } catch (err) {
      console.error('创建表失败:', err)
      throw err
    }
  }

  initDefaultSettings() {
    try {
      const defaultSettings = [
        { key: 'hotkey_add_folder', value: 'CommandOrControl+Alt+A' },
        { key: 'theme', value: 'light' }
      ]
      
      const insertSetting = this.db.prepare(`
        INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
      `)
      
      for (const setting of defaultSettings) {
        insertSetting.run(setting.key, setting.value)
      }
      
      console.log('默认设置初始化完成')
    } catch (err) {
      console.error('初始化默认设置失败:', err)
    }
  }

  migrateDatabase() {
    try {
      // 检查表结构
      const tableInfo = this.db.prepare("PRAGMA table_info(folders)").all()
      const columnNames = tableInfo.map(col => col.name)
      
      // 添加缺失的列
      if (!columnNames.includes('icon')) {
        console.log('添加icon列...')
        this.db.exec('ALTER TABLE folders ADD COLUMN icon TEXT')
      }
      
      if (!columnNames.includes('color')) {
        console.log('添加color列...')
        this.db.exec('ALTER TABLE folders ADD COLUMN color TEXT DEFAULT "#007acc"')
      }
      
      if (!columnNames.includes('pinyin')) {
        console.log('添加pinyin列...')
        this.db.exec('ALTER TABLE folders ADD COLUMN pinyin TEXT')
      }
      
      console.log('数据库迁移完成')
    } catch (err) {
      console.error('数据库迁移失败:', err)
      // 不抛出错误，因为这可能是新数据库
    }
  }

  getFolders() {
    if (!this.db) {
      throw new Error('数据库未初始化，请先调用init()方法')
    }
    
    try {
      const sql = 'SELECT * FROM folders ORDER BY created_at DESC'
      const stmt = this.db.prepare(sql)
      return stmt.all()
    } catch (err) {
      console.error('获取文件夹列表失败:', err)
      throw err
    }
  }

  addFolder(folderData) {
    if (!this.db) {
      throw new Error('数据库未初始化，请先调用init()方法')
    }
    
    try {
      const { name, path, icon = null, color = '#007acc' } = folderData
      
      // 生成拼音用于搜索
      let pinyin = name // 默认使用原名称
      try {
        const pinyinLib = require('pinyin')
        const pinyinResult = pinyinLib(name, { style: pinyinLib.STYLE_NORMAL })
        pinyin = pinyinResult.flat().join('')
      } catch (error) {
        console.warn('拼音生成失败，使用原名称:', error.message)
      }
      
      const sql = `
        INSERT INTO folders (name, path, icon, color, pinyin)
        VALUES (?, ?, ?, ?, ?)
      `
      
      const stmt = this.db.prepare(sql)
      const result = stmt.run(name, path, icon, color, pinyin)
      
      console.log('文件夹添加成功, ID:', result.lastInsertRowid)
      return {
        id: result.lastInsertRowid,
        name,
        path,
        icon,
        color,
        pinyin
      }
    } catch (err) {
      console.error('添加文件夹失败:', err)
      throw err
    }
  }

  updateFolder(id, folderData) {
    try {
      const { name, path, icon, color } = folderData
      
      // 生成拼音
      let pinyin = ''
      try {
        const pinyinLib = require('pinyin')
        if (typeof pinyinLib === 'function') {
          const pinyinResult = pinyinLib(name, { style: pinyinLib.STYLE_NORMAL })
          pinyin = pinyinResult.flat().join('')
        } else if (pinyinLib.default && typeof pinyinLib.default === 'function') {
          const pinyinResult = pinyinLib.default(name, { style: pinyinLib.default.STYLE_NORMAL })
          pinyin = pinyinResult.flat().join('')
        } else {
          console.warn('pinyin模块导入异常，使用原名称')
          pinyin = name
        }
      } catch (error) {
        console.warn('拼音生成失败:', error)
        pinyin = name // 如果拼音生成失败，使用原名称
      }
      
      const sql = `
        UPDATE folders 
        SET name = ?, path = ?, icon = ?, color = ?, pinyin = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      
      const stmt = this.db.prepare(sql)
      const result = stmt.run(name, path, icon, color, pinyin, id)
      
      console.log('文件夹更新成功, 影响行数:', result.changes)
      return result.changes > 0
    } catch (err) {
      console.error('更新文件夹失败:', err)
      throw err
    }
  }

  deleteFolder(id) {
    try {
      const sql = 'DELETE FROM folders WHERE id = ?'
      
      const stmt = this.db.prepare(sql)
      const result = stmt.run(id)
      
      console.log('文件夹删除成功, 影响行数:', result.changes)
      return result.changes > 0
    } catch (err) {
      console.error('删除文件夹失败:', err)
      throw err
    }
  }

  searchFolders(keyword) {
    try {
      const sql = `
        SELECT * FROM folders 
        WHERE name LIKE ? OR path LIKE ? OR pinyin LIKE ?
        ORDER BY created_at DESC
      `
      
      const searchTerm = `%${keyword}%`
      
      const stmt = this.db.prepare(sql)
      return stmt.all(searchTerm, searchTerm, searchTerm)
    } catch (err) {
      console.error('搜索文件夹失败:', err)
      throw err
    }
  }

  // 设置相关方法
  getSetting(key) {
    try {
      if (!this.db) {
        throw new Error('数据库未初始化')
      }
      
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?')
      const result = stmt.get(key)
      return result ? result.value : null
    } catch (err) {
      console.error('获取设置失败:', err)
      return null
    }
  }

  setSetting(key, value) {
    try {
      if (!this.db) {
        throw new Error('数据库未初始化')
      }
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `)
      
      const result = stmt.run(key, value)
      console.log(`设置 ${key} 更新成功`)
      return result.changes > 0
    } catch (err) {
      console.error('设置保存失败:', err)
      return false
    }
  }

  getAllSettings() {
    try {
      if (!this.db) {
        throw new Error('数据库未初始化')
      }
      
      const stmt = this.db.prepare('SELECT key, value FROM settings')
      const results = stmt.all()
      
      const settings = {}
      results.forEach(row => {
        settings[row.key] = row.value
      })
      
      return settings
    } catch (err) {
      console.error('获取所有设置失败:', err)
      return {}
    }
  }

  close() {
    if (this.db) {
      try {
        this.db.close()
        console.log('数据库连接已关闭')
      } catch (err) {
        console.error('关闭数据库失败:', err)
      }
    }
  }
}

module.exports = DatabaseManager