const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  globalShortcut,
  shell,
  dialog,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const Database = require("../database/database");
const WindowsRegistry = require("./windowsRegistry");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

class SmarterFolderLauncher {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.database = null;
    this.isQuitting = false;
    this.currentHotkey = "Alt+F";
    this.currentAddFolderHotkey = "CommandOrControl+Alt+A";
    this.windowsRegistry = new WindowsRegistry();
    this.pendingFolderPath = null;
  }

  async init() {
    console.log("SmarterFolderLauncher 开始初始化...");

    // 处理命令行参数
    this.handleCommandLineArgs();

    await this.initDatabase();
    console.log("数据库初始化完成，继续其他初始化...");
    this.createWindow();
    this.createTray();
    this.registerGlobalShortcuts();
    this.setupIpcHandlers();
    this.initAutoUpdater();

    // 注册Windows右键菜单
    await this.registerWindowsContextMenu();

    // 如果有待添加的文件夹，处理它
    if (this.pendingFolderPath) {
      await this.handleContextMenuFolder(this.pendingFolderPath);
    }

    console.log("SmarterFolderLauncher 初始化完成");
  }

  initAutoUpdater() {
    if (isDev) {
      console.log("开发环境，跳过自动更新检查");
      return;
    }

    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on("checking-for-update", () => {
      console.log("正在检查更新...");
    });

    autoUpdater.on("update-available", (info) => {
      console.log("发现新版本:", info.version);
    });

    autoUpdater.on("update-not-available", (info) => {
      console.log("当前已是最新版本");
    });

    autoUpdater.on("error", (err) => {
      console.error("自动更新错误:", err);
    });

    autoUpdater.on("download-progress", (progressObj) => {
      let log_message = "下载速度: " + progressObj.bytesPerSecond;
      log_message = log_message + " - 已下载 " + progressObj.percent + "%";
      log_message =
        log_message +
        " (" +
        progressObj.transferred +
        "/" +
        progressObj.total +
        ")";
      console.log(log_message);
    });

    autoUpdater.on("update-downloaded", (info) => {
      console.log("更新下载完成，将在重启后安装");
      autoUpdater.quitAndInstall();
    });
  }

  async initDatabase() {
    try {
      this.database = new Database();
      await this.database.init();
      console.log("数据库初始化完成");
    } catch (error) {
      console.error("数据库初始化失败:", error);
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 450,
      height: 600,
      minWidth: 350,
      minHeight: 400,
      maxWidth: 800,
      maxHeight: 1000,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    // 加载页面
    if (isDev) {
      this.mainWindow.loadURL("http://localhost:3000");
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, "../../dist-renderer/index.html")
      );
    }

    // 窗口事件
    this.mainWindow.on("blur", () => {
      if (!isDev) {
        setTimeout(() => {
          if (this.mainWindow && !this.mainWindow.isFocused()) {
            this.hideWindow();
          }
        }, 100);
      }
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    this.mainWindow.on("ready-to-show", () => {
      this.centerWindow();
      if (isDev) {
        this.showWindow();
      }
    });
  }

  createTray() {
    const iconPath = path.join(__dirname, "../../assets/icon.png");
    this.tray = new Tray(iconPath);

    this.tray.setToolTip("智能文件夹启动器");

    // 双击托盘图标显示窗口
    this.tray.on("double-click", () => {
      this.showWindow();
    });

    // Windows平台单击事件
    if (process.platform === "win32") {
      let clickTimeout = null;
      this.tray.on("click", () => {
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
          return;
        }
        clickTimeout = setTimeout(() => {
          this.toggleWindow();
          clickTimeout = null;
        }, 200);
      });
    }

    this.updateTrayMenu();
  }

  updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "显示主界面",
        click: () => this.showWindow(),
      },
      {
        label: "添加文件夹",
        click: () => this.addFolderFromTray(),
      },
      { type: "separator" },
      {
        label: "设置",
        click: () => this.openSettings(),
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  async registerGlobalShortcuts() {
    if (!app.isReady()) {
      console.log("应用未就绪，延迟注册快捷键");
      return;
    }

    // 从数据库读取自定义快捷键设置
    if (this.database) {
      const addFolderHotkey = this.database.getSetting("hotkey_add_folder");
      if (addFolderHotkey) {
        this.currentAddFolderHotkey = addFolderHotkey;
      }
    }

    // 注册全局快捷键
    let registered = globalShortcut.register(this.currentHotkey, () => {
      this.toggleWindow();
    });

    if (registered) {
      console.log(`全局快捷键注册成功: ${this.currentHotkey}`);
    } else {
      console.log(`全局快捷键 ${this.currentHotkey} 注册失败，尝试备用快捷键`);
      // 尝试备用快捷键
      const backupHotkey = "CommandOrControl+Shift+F";
      registered = globalShortcut.register(backupHotkey, () => {
        this.toggleWindow();
      });

      if (registered) {
        console.log(`备用快捷键注册成功: ${backupHotkey}`);
        this.currentHotkey = backupHotkey;
      } else {
        console.log("备用快捷键也注册失败");
      }
    }

    // 注册添加文件夹快捷键
    let addFolderRegistered = globalShortcut.register(
      this.currentAddFolderHotkey,
      () => {
        this.addFolderFromTray();
      }
    );

    if (addFolderRegistered) {
      console.log(`添加文件夹快捷键注册成功: ${this.currentAddFolderHotkey}`);
    } else {
      console.log(
        `添加文件夹快捷键 ${this.currentAddFolderHotkey} 注册失败，尝试备用快捷键`
      );
      // 尝试备用快捷键
      const backupAddFolderHotkey = "CommandOrControl+Shift+A";
      addFolderRegistered = globalShortcut.register(
        backupAddFolderHotkey,
        () => {
          this.addFolderFromTray();
        }
      );

      if (addFolderRegistered) {
        console.log(`添加文件夹备用快捷键注册成功: ${backupAddFolderHotkey}`);
        this.currentAddFolderHotkey = backupAddFolderHotkey;
      } else {
        console.log("添加文件夹备用快捷键也注册失败");
      }
    }
  }

  setupIpcHandlers() {
    // 窗口控制
    ipcMain.handle("close-window", () => {
      this.hideWindow();
    });

    ipcMain.handle("minimize-window", () => {
      if (this.mainWindow) {
        this.mainWindow.minimize();
      }
    });

    // 文件夹操作
    ipcMain.handle("get-folders", async (event, sortBy = "smart") => {
      if (this.database) {
        return await this.database.getFolders(sortBy);
      }
      return [];
    });

    // 记录文件夹访问
    ipcMain.handle("record-access", async (event, folderId) => {
      if (this.database) {
        return await this.database.recordAccess(folderId);
      }
      return false;
    });

    // 获取访问统计
    ipcMain.handle("get-access-stats", async () => {
      if (this.database) {
        return await this.database.getAccessStats();
      }
      return null;
    });

    ipcMain.handle("add-folder", async (event, folderData) => {
      if (this.database) {
        return await this.database.addFolder(folderData);
      }
      return null;
    });

    // 检查更新
    ipcMain.handle("check-for-updates", async () => {
      if (isDev) {
        return { success: false, message: "开发环境不支持更新检查" };
      }
      try {
        const result = await autoUpdater.checkForUpdates();
        if (result && result.updateInfo) {
          return { success: true, data: result };
        } else {
          return { success: true, message: "当前已是最新版本" };
        }
      } catch (error) {
        console.error("更新检查失败:", error);
        // 提供更友好的错误信息
        let errorMessage = "检查更新失败";
        if (error.message.includes("net::ERR_INTERNET_DISCONNECTED")) {
          errorMessage = "网络连接失败，请检查网络连接后重试";
        } else if (error.message.includes("net::ERR_NAME_NOT_RESOLVED")) {
          errorMessage = "无法连接到更新服务器，请检查网络连接";
        } else if (error.message.includes("404")) {
          errorMessage = "更新服务暂时不可用，请稍后重试";
        }
        return { success: false, message: errorMessage };
      }
    });

    // 下载并安装更新
    ipcMain.handle("download-update", async () => {
      if (isDev) {
        return { success: false, message: "开发环境不支持更新" };
      }
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 退出并安装更新
    ipcMain.handle("quit-and-install", () => {
      autoUpdater.quitAndInstall();
    });

    ipcMain.handle("update-folder", async (event, id, folderData) => {
      if (this.database) {
        return await this.database.updateFolder(id, folderData);
      }
      return false;
    });

    ipcMain.handle("delete-folder", async (event, id) => {
      if (this.database) {
        return await this.database.deleteFolder(id);
      }
      return false;
    });

    ipcMain.handle("open-folder", async (event, folderPath) => {
      try {
        await shell.openPath(folderPath);
        return true;
      } catch (error) {
        console.error("打开文件夹失败:", error);
        return false;
      }
    });

    ipcMain.handle("select-folder", async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ["openDirectory"],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    });

    // 设置相关
    ipcMain.handle("open-settings", () => {
      this.openSettings();
    });

    ipcMain.handle("update-hotkey", (event, newHotkey) => {
      return this.updateGlobalHotkey(newHotkey);
    });

    ipcMain.handle("get-settings", () => {
      if (this.database) {
        return this.database.getAllSettings();
      }
      return {};
    });

    ipcMain.handle("save-setting", (event, key, value) => {
      if (this.database) {
        return this.database.setSetting(key, value);
      }
      return false;
    });

    ipcMain.handle("update-add-folder-hotkey", (event, newHotkey) => {
      return this.updateAddFolderHotkey(newHotkey);
    });

    ipcMain.handle("get-current-hotkeys", () => {
      return {
        toggleWindow: this.currentHotkey,
        addFolder: this.currentAddFolderHotkey,
      };
    });

    // 打开外部链接
    ipcMain.handle("open-external", async (event, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error("打开外部链接失败:", error);
        return { success: false, error: error.message };
      }
    });

    // Windows右键菜单相关
    ipcMain.handle("register-context-menu", async () => {
      return await this.windowsRegistry.registerContextMenu();
    });

    ipcMain.handle("unregister-context-menu", async () => {
      return await this.windowsRegistry.unregisterContextMenu();
    });

    ipcMain.handle("is-context-menu-registered", async () => {
      return await this.windowsRegistry.isContextMenuRegistered();
    });

    // 在VSCode中打开文件夹
    ipcMain.handle("open-folder-in-vscode", async (event, folderPath) => {
      try {
        const { spawn } = require("child_process");
        const vscodeExecutablePath = "D:\\VScode\\Microsoft VS Code\\Code.exe"; // User provided path

        // Check if the user-provided path exists
        if (fs.existsSync(vscodeExecutablePath)) {
          // Use shell.openPath with the executable and arguments
          await shell.openPath(vscodeExecutablePath, { args: [folderPath] });
          return { success: true };
        }

        // Fallback to other common paths if user-provided path doesn't exist or fails
        const vscodeCommands = [
          "code",
          "code.cmd",
          path.join(
            process.env.LOCALAPPDATA || "",
            "Programs",
            "Microsoft VS Code",
            "bin",
            "code.cmd"
          ),
          path.join(
            process.env.PROGRAMFILES || "",
            "Microsoft VS Code",
            "bin",
            "code.cmd"
          ),
          path.join(
            process.env["PROGRAMFILES(X86)"] || "",
            "Microsoft VS Code",
            "bin",
            "code.cmd"
          ),
        ];

        let success = false;
        for (const command of vscodeCommands) {
          try {
            const { execSync } = require("child_process");
            execSync(`${command} -v`); // Check if command exists
            spawn(command, [folderPath], { detached: true, stdio: "ignore" });
            success = true;
            break;
          } catch (error) {
            continue;
          }
        }

        if (!success) {
          // Final fallback: try to open the folder directly with shell.openPath
          try {
            await shell.openPath(folderPath);
            return { success: true };
          } catch (e) {
            console.error("在VSCode中打开文件夹失败 (shell.openPath):", e);
            return {
              success: false,
              error: "VSCode 未找到，且无法使用备选方案打开",
            };
          }
        }

        return { success: true };
      } catch (error) {
        console.error("在VSCode中打开文件夹失败:", error);
        dialog.showErrorBox(
          "打开VSCode失败",
          "打开VSCode失败，请确保已安装VSCode或配置正确的路径。"
        );
        return { success: false, error: "打开VSCode失败，请确保已安装VSCode" };
      }
    });

    // 在终端中打开文件夹
    ipcMain.handle("open-folder-in-terminal", async (event, folderPath) => {
      const { spawn } = require("child_process"); // Import spawn here

      try {
        // Use PowerShell to open a new terminal and navigate to the folder
        spawn(
          "powershell.exe",
          ["-NoExit", "-Command", `Set-Location -LiteralPath "${folderPath}"`],
          {
            detached: true,
            stdio: "ignore",
          }
        );

        return { success: true };
      } catch (error) {
        console.error("在终端中打开文件夹失败:", error);
        dialog.showErrorBox(
          "打开终端失败",
          "打开终端失败，请检查系统终端配置。"
        );
        return { success: false, error: "打开终端失败" };
      }
    });
  }

  showWindow() {
    if (this.mainWindow) {
      this.centerWindow();
      this.mainWindow.show();
      this.mainWindow.focus();
      // 确保窗口在最前面
      this.mainWindow.setAlwaysOnTop(true);
      this.mainWindow.setAlwaysOnTop(false);
      this.mainWindow.setAlwaysOnTop(true);
    }
  }

  hideWindow() {
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  toggleWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible()) {
        this.hideWindow();
      } else {
        this.showWindow();
      }
    }
  }

  centerWindow() {
    if (this.mainWindow) {
      this.mainWindow.center();
    }
  }

  async addFolderFromTray() {
    const folderPath = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (!folderPath.canceled && folderPath.filePaths.length > 0) {
      const path = folderPath.filePaths[0];
      const name = require("path").basename(path);

      if (this.database) {
        await this.database.addFolder({ name, path });
        console.log("文件夹添加成功:", name);

        // 通知渲染进程刷新文件夹列表
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send("folder-added");
        }
      }
    }
  }

  updateGlobalHotkey(newHotkey) {
    try {
      // 转换前端快捷键格式到Electron格式
      const electronHotkey = this.convertHotkeyFormat(newHotkey);

      // 先注销当前快捷键
      globalShortcut.unregister(this.currentHotkey);

      // 注册新快捷键
      const registered = globalShortcut.register(electronHotkey, () => {
        this.toggleWindow();
      });

      if (registered) {
        this.currentHotkey = electronHotkey;
        console.log(`全局快捷键更新成功: ${electronHotkey}`);
        return { success: true, message: "快捷键更新成功" };
      } else {
        // 如果注册失败，恢复原快捷键
        globalShortcut.register(this.currentHotkey, () => {
          this.toggleWindow();
        });
        console.log("新快捷键注册失败，已恢复原快捷键");
        return { success: false, message: "快捷键已被占用或无效" };
      }
    } catch (error) {
      console.error("更新快捷键失败:", error);
      return { success: false, message: "快捷键格式无效" };
    }
  }

  updateAddFolderHotkey(newHotkey) {
    try {
      // 转换前端快捷键格式到Electron格式
      const electronHotkey = this.convertHotkeyFormat(newHotkey);

      // 先注销当前添加文件夹快捷键
      globalShortcut.unregister(this.currentAddFolderHotkey);

      // 注册新的添加文件夹快捷键
      const registered = globalShortcut.register(electronHotkey, () => {
        this.addFolderFromTray();
      });

      if (registered) {
        this.currentAddFolderHotkey = electronHotkey;
        console.log(`添加文件夹快捷键更新成功: ${electronHotkey}`);

        // 保存到数据库
        if (this.database) {
          this.database.setSetting("hotkey_add_folder", electronHotkey);
        }

        return { success: true, message: "添加文件夹快捷键更新成功" };
      } else {
        // 如果注册失败，恢复原快捷键
        globalShortcut.register(this.currentAddFolderHotkey, () => {
          this.addFolderFromTray();
        });
        console.log("新的添加文件夹快捷键注册失败，已恢复原快捷键");
        return { success: false, message: "快捷键已被占用或无效" };
      }
    } catch (error) {
      console.error("更新添加文件夹快捷键失败:", error);
      return { success: false, message: "快捷键格式无效" };
    }
  }

  convertHotkeyFormat(hotkey) {
    // 将前端格式 (Ctrl+Alt+F) 转换为 Electron 格式 (CommandOrControl+Alt+F)
    return hotkey.replace(/Ctrl/g, "CommandOrControl");
  }

  openSettings() {
    console.log("打开设置");
    // 显示主窗口并发送设置事件
    this.showWindow();
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send("open-settings-page");
    }
  }

  /**
   * 处理命令行参数
   */
  handleCommandLineArgs() {
    // 检查是否有文件夹路径参数
    const args = process.argv.slice(2);
    if (args.length > 0 && args[0] !== "." && !args[0].startsWith("--")) {
      this.pendingFolderPath = args[0];
      console.log("检测到命令行参数文件夹路径:", this.pendingFolderPath);
    }
  }

  /**
   * 获取随机颜色
   */
  getRandomColor() {
    const colors = [
      "#007acc",
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#feca57",
      "#ff9ff3",
      "#54a0ff",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 注册Windows右键菜单
   */
  async registerWindowsContextMenu() {
    if (process.platform === "win32") {
      try {
        const result = await this.windowsRegistry.registerContextMenu();
        console.log("Windows右键菜单注册结果:", result);
        return result;
      } catch (error) {
        console.error("注册Windows右键菜单失败:", error);
        // 检查是否是权限错误
        if (error.message.includes("拒绝访问")) {
          dialog.showErrorBox(
            "注册右键菜单失败",
            "注册表操作失败，请以管理员身份运行程序。"
          );
          return {
            success: false,
            message: "注册表操作失败，请以管理员身份运行程序。",
          };
        }
        dialog.showErrorBox(
          "注册右键菜单失败",
          "注册表操作失败，请确保具有足够的系统权限。"
        );
        return { success: false, message: error.message };
      }
    }
    return { success: false, message: "仅支持Windows系统" };
  }

  /**
   * 处理从右键菜单添加文件夹
   */
  async handleContextMenuFolder(folderPath) {
    if (!folderPath || !this.database) {
      return false;
    }

    try {
      // 检查文件夹是否存在
      if (!fs.existsSync(folderPath)) {
        console.log("文件夹不存在:", folderPath);
        return false;
      }

      // 检查是否已经添加过
      const existingFolder = await this.database.getFolderByPath(folderPath);
      if (existingFolder) {
        console.log("文件夹已存在:", folderPath);
        return true;
      }

      // 添加文件夹
      const folderName = path.basename(folderPath);
      const folderData = {
        name: folderName,
        path: folderPath,
        color: this.getRandomColor(),
      };

      const result = await this.database.addFolder(folderData);
      if (result) {
        console.log("从右键菜单添加文件夹成功:", folderPath);
        // 通知渲染进程更新文件夹列表
        if (this.mainWindow) {
          this.mainWindow.webContents.send("folder-added", result);
        }
        return true;
      }
    } catch (error) {
      console.error("处理右键菜单文件夹失败:", error);
    }
    return false;
  }
}

// 应用事件处理
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
});

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let launcherInstance = null;

  app.whenReady().then(async () => {
    launcherInstance = new SmarterFolderLauncher();
    await launcherInstance.init();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        launcherInstance.createWindow();
      }
    });
  });

  app.on("second-instance", () => {
    // 当运行第二个实例时，将会聚焦到主窗口
    if (launcherInstance && launcherInstance.mainWindow) {
      if (launcherInstance.mainWindow.isMinimized())
        launcherInstance.mainWindow.restore();
      launcherInstance.mainWindow.focus();
      launcherInstance.showWindow();
    }
  });
}

// 在文件开头添加
process.on("uncaughtException", (error) => {
  console.error("未捕获的异常:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的 Promise 拒绝:", reason);
});
// 修改数据库引用
try {
  const Database = require(path.join(__dirname, "../database/database"));
} catch (error) {
  console.error("加载数据库模块失败:", error);
  // 可以考虑使用备用方案或退出应用
}
