const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  
  // 文件夹操作
  getFolders: () => ipcRenderer.invoke('get-folders'),
  addFolder: (folderData) => ipcRenderer.invoke('add-folder', folderData),
  updateFolder: (id, folderData) => ipcRenderer.invoke('update-folder', id, folderData),
  deleteFolder: (id) => ipcRenderer.invoke('delete-folder', id),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // 设置
  openSettings: () => ipcRenderer.invoke('open-settings'),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings-page', callback),
  updateHotkey: (newHotkey) => ipcRenderer.invoke('update-hotkey', newHotkey),
  updateAddFolderHotkey: (newHotkey) => ipcRenderer.invoke('update-add-folder-hotkey', newHotkey),
  
  // 更新功能
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  
  // 平台信息
  platform: process.platform
})