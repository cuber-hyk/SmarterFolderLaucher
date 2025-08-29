import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// 检查是否在Electron环境中
if (!window.electronAPI) {
  // 开发环境模拟API
  window.electronAPI = {
    closeWindow: () => console.log('模拟关闭窗口'),
    minimizeWindow: () => console.log('模拟最小化窗口'),
    getFolders: () => Promise.resolve([]),
    addFolder: (data) => Promise.resolve({ id: Date.now(), ...data }),
    updateFolder: (id, data) => Promise.resolve(true),
    deleteFolder: (id) => Promise.resolve(true),
    openFolder: (path) => Promise.resolve(true),
    selectFolder: () => Promise.resolve('/mock/folder/path'),
    openSettings: () => console.log('模拟打开设置'),
    platform: 'win32'
  }
}

const app = createApp(App)
app.mount('#app')