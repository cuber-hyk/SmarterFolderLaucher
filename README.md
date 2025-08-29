# 智能文件夹启动器 (Smarter Folder Launcher)

一个基于 Electron + Vue 3 的智能文件夹快速访问工具，帮助您快速打开常用文件夹，提高工作效率。

## ✨ 功能特性

- 🚀 **快速启动**: 通过全局快捷键或托盘图标快速打开应用
- 📁 **文件夹管理**: 添加、删除、编辑常用文件夹
- 🔍 **智能搜索**: 支持中文拼音搜索，快速定位文件夹
- 🎨 **美观界面**: 现代化的毛玻璃效果界面设计
- ⚡ **高性能**: 基于 SQLite 数据库，响应迅速
- 🔧 **系统集成**: 系统托盘常驻，开机自启动

## 🎯 快捷键

- `Ctrl + Alt + F`: 显示/隐藏主窗口
- `Ctrl + Alt + A`: 快速添加文件夹

## 🛠️ 技术栈

- **前端**: Vue 3 + Vite
- **桌面端**: Electron
- **数据库**: SQLite3
- **构建工具**: Electron Builder

## 📦 安装与运行

### 开发环境

1. 克隆项目
```bash
git clone <repository-url>
cd SmarterFolderLaucher
```

2. 安装依赖
```bash
npm install
# 或者使用 pnpm
pnpm install
```

3. 启动开发服务器
```bash
npm run dev
```

### 生产构建

```bash
# 构建应用
npm run build

# 仅构建渲染进程
npm run build:renderer

# 仅构建主进程
npm run build:main
```

## 📁 项目结构

```
SmarterFolderLaucher/
├── src/
│   ├── main/                 # 主进程代码
│   │   ├── main.js          # 主进程入口
│   │   └── preload.js       # 预加载脚本
│   ├── renderer/            # 渲染进程代码
│   │   ├── App.vue          # 主组件
│   │   ├── index.html       # HTML 模板
│   │   ├── main.js          # 渲染进程入口
│   │   └── style.css        # 样式文件
│   ├── database/            # 数据库模块
│   │   └── database.js      # 数据库操作
│   └── utils/               # 工具函数
├── assets/                  # 静态资源
│   └── icon.svg            # 应用图标
├── package.json
├── vite.config.js          # Vite 配置
└── README.md
```

## 🎮 使用方法

1. **添加文件夹**: 点击底部的「添加」按钮或使用快捷键 `Ctrl + Alt + A`
2. **打开文件夹**: 点击文件夹项即可在文件管理器中打开
3. **搜索文件夹**: 在搜索框中输入关键词，支持中文拼音搜索
4. **管理文件夹**: 右键点击文件夹项可进行编辑或删除操作
5. **快速访问**: 使用 `Ctrl + Alt + F` 快捷键随时调出应用

## 🔧 配置说明

应用数据存储在用户数据目录中：
- **Windows**: `%APPDATA%/smarter-folder-launcher/`
- **macOS**: `~/Library/Application Support/smarter-folder-launcher/`
- **Linux**: `~/.config/smarter-folder-launcher/`

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [SQLite](https://www.sqlite.org/) - 轻量级数据库引擎