<template>
  <div class="app">
    <!-- 标题栏 -->
    <div class="title-bar">
      <div class="title">智能文件夹启动器</div>
      <div class="window-controls">
        <button class="control-btn minimize" @click="minimizeWindow" title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="5" width="8" height="2" fill="currentColor"/>
          </svg>
        </button>
        <button class="control-btn close" @click="closeWindow" title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="search-container">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="搜索文件夹..." 
        class="search-input"
        @input="handleSearch"
        ref="searchInput"
      >
    </div>

    <!-- 文件夹列表 -->
    <div class="folders-container">
      <div v-if="filteredFolders.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <div class="empty-text">暂无文件夹</div>
        <button class="add-btn" @click="addFolder">添加文件夹</button>
      </div>
      
      <div v-else class="folders-list">
        <div 
          v-for="folder in filteredFolders" 
          :key="folder.id"
          class="folder-item"
          @click="openFolder(folder.path)"
          @contextmenu="showContextMenu(folder, $event)"
        >
          <div class="folder-icon" :style="{ backgroundColor: folder.color }">
            {{ folder.icon || '📁' }}
          </div>
          <div class="folder-info">
            <div class="folder-name">{{ folder.name }}</div>
            <div class="folder-path">{{ folder.path }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-bar">
      <button class="action-btn" @click="addFolder" title="添加文件夹">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        添加
      </button>
      <button class="action-btn" @click="refreshFolders" title="刷新">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M1 4V10A6 6 0 0 0 13 10V9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 4H1L3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        刷新
      </button>
      <button class="action-btn" @click="openSettings" title="设置">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 0 0-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
        </svg>
        设置
      </button>
    </div>

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenu.show" 
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="menu-item" @click="editFolder(contextMenu.folder)">编辑</div>
      <div class="menu-item danger" @click="deleteFolder(contextMenu.folder)">删除</div>
    </div>

    <!-- 编辑文件夹弹窗 -->
    <div v-if="showEditDialog" class="settings-overlay">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>编辑文件夹</h3>
          <button class="close-settings" @click="closeEditDialog">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="settings-content">
          <div class="setting-item">
            <label>文件夹名称</label>
            <input type="text" v-model="editingFolder.name" placeholder="请输入文件夹名称">
          </div>
          <div class="setting-item">
            <label>文件夹路径</label>
            <input type="text" v-model="editingFolder.path" readonly>
          </div>
          <div class="setting-item">
            <label>图标颜色</label>
            <div class="color-picker">
              <div 
                v-for="color in colorOptions" 
                :key="color"
                class="color-option"
                :class="{ active: editingFolder.color === color }"
                :style="{ backgroundColor: color }"
                @click="editingFolder.color = color"
              ></div>
            </div>
          </div>
          <div class="setting-actions">
            <button class="btn btn-cancel" @click="closeEditDialog">取消</button>
            <button class="btn btn-save" @click="saveEditedFolder">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置页面 -->
    <div v-if="showSettings" class="settings-overlay">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>设置</h3>
          <button class="close-settings" @click="closeSettings">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="settings-content">
          <div class="setting-item">
            <label>应用主题</label>
            <select v-model="settings.theme" @change="applyTheme">
              <option value="light">浅色主题</option>
              <option value="dark">深色主题</option>
            </select>
          </div>
          <div class="setting-item">
            <label>启动时显示</label>
            <input type="checkbox" v-model="settings.showOnStartup">
          </div>
          <div class="setting-item">
            <label>全局快捷键</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input 
                type="text" 
                :value="isEditingHotkey ? tempHotkey : settings.globalHotkey"
                :readonly="!isEditingHotkey"
                @keydown="captureHotkey"
                @blur="cancelHotkeyEdit"
                ref="hotkeyInput"
                placeholder="按下组合键..."
                style="flex: 1;"
              >
              <button 
                class="btn" 
                :class="isEditingHotkey ? 'btn-cancel' : 'btn-save'"
                @click="toggleHotkeyEdit"
                style="padding: 6px 12px; font-size: 12px;"
              >
                {{ isEditingHotkey ? '取消' : '修改' }}
              </button>
            </div>
          </div>
          <div class="setting-item">
            <label>应用更新</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="flex: 1; font-size: 12px; color: #666;">
                {{ updateInfo.available ? `发现新版本 ${updateInfo.version}` : '当前版本已是最新' }}
              </span>
              <button 
                class="btn btn-save"
                @click="checkForUpdates"
                :disabled="updateInfo.checking"
                style="padding: 6px 12px; font-size: 12px;"
              >
                {{ updateInfo.checking ? '检查中...' : '检查更新' }}
              </button>
              <button 
                v-if="updateInfo.available"
                class="btn btn-save"
                @click="downloadUpdate"
                :disabled="updateInfo.downloading"
                style="padding: 6px 12px; font-size: 12px;"
              >
                {{ updateInfo.downloading ? '下载中...' : '下载更新' }}
              </button>
            </div>
          </div>
          <div class="setting-actions">
            <button class="btn btn-cancel" @click="closeSettings">取消</button>
            <button class="btn btn-save" @click="saveSettings">保存设置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 遮罩层 -->
    <div v-if="contextMenu.show" class="overlay" @click="hideContextMenu"></div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      folders: [],
      searchQuery: '',
      showSettings: false,
      showEditDialog: false,
      editingFolder: {
        id: null,
        name: '',
        path: '',
        color: '#007acc'
      },
      settings: {
        theme: 'light',
        showOnStartup: true,
        globalHotkey: 'Ctrl+Alt+F'
      },
      updateInfo: {
        checking: false,
        available: false,
        downloading: false,
        version: '',
        progress: 0
      },
      isEditingHotkey: false,
      tempHotkey: '',
      colorOptions: [
        '#007acc', '#ff6b6b', '#4ecdc4', '#45b7d1',
        '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff',
        '#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe'
      ],
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        folder: null
      }
    }
  },
  computed: {
    filteredFolders() {
      if (!this.searchQuery) {
        return this.folders
      }
      
      const query = this.searchQuery.toLowerCase()
      return this.folders.filter(folder => 
        folder.name.toLowerCase().includes(query) ||
        folder.path.toLowerCase().includes(query) ||
        (folder.pinyin && folder.pinyin.toLowerCase().includes(query))
      )
    }
  },
  async mounted() {
    await this.loadFolders()
    await this.loadSettings()
    this.$refs.searchInput?.focus()
    
    // 点击其他地方隐藏右键菜单
    document.addEventListener('click', this.hideContextMenu)
    
    // 监听主进程发送的设置页面事件
    if (window.electronAPI && window.electronAPI.onOpenSettings) {
      window.electronAPI.onOpenSettings(() => {
        this.showSettings = true
      })
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.hideContextMenu)
  },
  methods: {
    async loadFolders() {
      try {
        this.folders = await window.electronAPI.getFolders()
      } catch (error) {
        console.error('加载文件夹失败:', error)
      }
    },
    
    async addFolder() {
      try {
        const folderPath = await window.electronAPI.selectFolder()
        if (folderPath) {
          const folderName = folderPath.split(/[\\/]/).pop()
          const folderData = {
            name: folderName,
            path: folderPath,
            color: this.getRandomColor()
          }
          
          await window.electronAPI.addFolder(folderData)
          await this.loadFolders()
        }
      } catch (error) {
        console.error('添加文件夹失败:', error)
      }
    },
    
    async openFolder(folderPath) {
      try {
        await window.electronAPI.openFolder(folderPath)
        // 不再自动隐藏窗口，让用户手动控制
      } catch (error) {
        console.error('打开文件夹失败:', error)
      }
    },
    
    async deleteFolder(folder) {
      if (confirm(`确定要删除文件夹 "${folder.name}" 吗？`)) {
        try {
          await window.electronAPI.deleteFolder(folder.id)
          await this.loadFolders()
        } catch (error) {
          console.error('删除文件夹失败:', error)
        }
      }
      this.hideContextMenu()
    },
    
    editFolder(folder) {
      this.editingFolder = {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        color: folder.color || '#007acc'
      }
      this.showEditDialog = true
      this.hideContextMenu()
    },
    
    async saveEditedFolder() {
      try {
        await window.electronAPI.updateFolder(this.editingFolder.id, {
          name: this.editingFolder.name,
          color: this.editingFolder.color
        })
        await this.loadFolders()
        this.closeEditDialog()
      } catch (error) {
        console.error('保存文件夹失败:', error)
        alert('保存失败，请重试')
      }
    },
    
    closeEditDialog() {
      this.showEditDialog = false
      this.editingFolder = {
        id: null,
        name: '',
        path: '',
        color: '#007acc'
      }
    },
    
    async refreshFolders() {
      await this.loadFolders()
    },
    
    handleSearch() {
      // 搜索逻辑已在computed中实现
    },
    
    showContextMenu(folder, event) {
      event.preventDefault()
      this.contextMenu = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        folder
      }
    },
    
    hideContextMenu() {
      this.contextMenu.show = false
    },
    
    closeWindow() {
      window.electronAPI.closeWindow()
    },
    
    minimizeWindow() {
      window.electronAPI.minimizeWindow()
    },
    
    getRandomColor() {
      const colors = [
        '#007acc', '#ff6b6b', '#4ecdc4', '#45b7d1',
        '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'
      ]
      return colors[Math.floor(Math.random() * colors.length)]
    },
    
    openSettings() {
      this.showSettings = true
    },
    
    closeSettings() {
      this.showSettings = false
    },
    
    async saveSettings() {
      try {
        // 保存到本地存储
        localStorage.setItem('appSettings', JSON.stringify(this.settings))
        
        // 更新主进程的全局快捷键
        if (window.electronAPI && window.electronAPI.updateHotkey) {
          const result = await window.electronAPI.updateHotkey(this.settings.globalHotkey)
          if (!result.success) {
            alert(`快捷键设置失败: ${result.message}`)
            return
          }
        }
        
        this.applyTheme()
        this.closeSettings()
        alert('设置已保存')
      } catch (error) {
        console.error('保存设置失败:', error)
        alert('保存设置失败，请重试')
      }
    },
    
    applyTheme() {
      if (this.settings.theme === 'dark') {
        document.body.classList.add('dark-theme')
      } else {
        document.body.classList.remove('dark-theme')
      }
    },
    
    async loadSettings() {
      try {
        const savedSettings = localStorage.getItem('appSettings')
        if (savedSettings) {
          this.settings = { ...this.settings, ...JSON.parse(savedSettings) }
          this.applyTheme()
          
          // 如果有保存的快捷键设置，应用到主进程
          if (this.settings.globalHotkey && this.settings.globalHotkey !== 'Ctrl+Alt+F') {
            if (window.electronAPI && window.electronAPI.updateHotkey) {
              await window.electronAPI.updateHotkey(this.settings.globalHotkey)
            }
          }
        }
      } catch (error) {
        console.error('加载设置失败:', error)
      }
    },
    
    toggleHotkeyEdit() {
      if (this.isEditingHotkey) {
        // 取消编辑
        this.isEditingHotkey = false
        this.tempHotkey = ''
      } else {
        // 开始编辑
        this.isEditingHotkey = true
        this.tempHotkey = ''
        this.$nextTick(() => {
          this.$refs.hotkeyInput?.focus()
        })
      }
    },
    
    captureHotkey(event) {
      if (!this.isEditingHotkey) return
      
      event.preventDefault()
      
      const keys = []
      if (event.ctrlKey) keys.push('Ctrl')
      if (event.altKey) keys.push('Alt')
      if (event.shiftKey) keys.push('Shift')
      if (event.metaKey) keys.push('Meta')
      
      // 只有在按下非修饰键时才完成快捷键设置
      if (event.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
        let key = event.key.toUpperCase()
        if (key === ' ') key = 'Space'
        keys.push(key)
        
        const hotkey = keys.join('+')
        this.tempHotkey = hotkey
        
        // 自动保存新的快捷键
        setTimeout(() => {
          this.settings.globalHotkey = hotkey
          this.isEditingHotkey = false
          this.tempHotkey = ''
        }, 100)
      } else {
        // 显示当前按下的修饰键
        this.tempHotkey = keys.join('+') + (keys.length > 0 ? '+' : '')
      }
    },
    
    cancelHotkeyEdit() {
      setTimeout(() => {
        this.isEditingHotkey = false
        this.tempHotkey = ''
      }, 150)
    },

    async checkForUpdates() {
      try {
        this.updateInfo.checking = true
        const result = await window.electronAPI.checkForUpdates()
        
        if (result.success) {
          if (result.data && result.data.updateInfo) {
            this.updateInfo.available = true
            this.updateInfo.version = result.data.updateInfo.version
            alert(`发现新版本 ${result.data.updateInfo.version}，可以下载更新！`)
          } else {
            alert('当前已是最新版本')
          }
        } else {
          alert(result.message || '检查更新失败')
        }
      } catch (error) {
        console.error('检查更新失败:', error)
        alert('检查更新失败，请重试')
      } finally {
        this.updateInfo.checking = false
      }
    },

    async downloadUpdate() {
      try {
        this.updateInfo.downloading = true
        const result = await window.electronAPI.downloadUpdate()
        
        if (result.success) {
          alert('更新下载完成，应用将重启并安装更新')
          await window.electronAPI.quitAndInstall()
        } else {
          alert(result.error || '下载更新失败')
        }
      } catch (error) {
        console.error('下载更新失败:', error)
        alert('下载更新失败，请重试')
      } finally {
        this.updateInfo.downloading = false
      }
    }
  }
}
</script>