const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  
  // 文件夹操作
  getFolders: (sortBy) => ipcRenderer.invoke('get-folders', sortBy),
  addFolder: (folderData) => ipcRenderer.invoke('add-folder', folderData),
  updateFolder: (id, folderData) => ipcRenderer.invoke('update-folder', id, folderData),
  deleteFolder: (id) => ipcRenderer.invoke('delete-folder', id),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // 访问统计
  recordAccess: (folderId) => ipcRenderer.invoke('record-access', folderId),
  getAccessStats: () => ipcRenderer.invoke('get-access-stats'),
  
  // 设置
  openSettings: () => ipcRenderer.invoke('open-settings'),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings-page', callback),
  onFolderAdded: (callback) => ipcRenderer.on('folder-added', callback),
  updateHotkey: (newHotkey) => ipcRenderer.invoke('update-hotkey', newHotkey),
  updateAddFolderHotkey: (newHotkey) => ipcRenderer.invoke('update-add-folder-hotkey', newHotkey),
  
  // 更新功能
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  
  // 外部链接
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Windows右键菜单
  registerContextMenu: () => ipcRenderer.invoke('register-context-menu'),
  unregisterContextMenu: () => ipcRenderer.invoke('unregister-context-menu'),
  isContextMenuRegistered: () => ipcRenderer.invoke('is-context-menu-registered'),
  
  // 在外部应用中打开文件夹
  openFolderInVSCode: (folderPath) => ipcRenderer.invoke('open-folder-in-vscode', folderPath),
  openFolderInTerminal: (folderPath) => ipcRenderer.invoke('open-folder-in-terminal', folderPath),
  
  // 平台信息
  platform: process.platform
})