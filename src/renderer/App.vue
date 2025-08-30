<template>
  <div class="app">
    <!-- 标题栏 -->
    <div class="title-bar">
      <div class="title">智能文件夹启动器 <span class="version">v2.1.0</span></div>
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

    <!-- 搜索框和排序 -->
    <div class="search-container">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="搜索文件夹..." 
        class="search-input"
        @input="handleSearch"
        ref="searchInput"
      >
      <!-- 排序下拉选择器 -->
      <div class="sort-dropdown-container">
        <div class="sort-dropdown" @click="toggleSortDropdown" :class="{ active: showSortDropdown }">
          <div class="sort-selected">
            <svg width="14" height="14" viewBox="0 0 16 16" v-html="currentSortOption.icon"></svg>
            <span>{{ currentSortOption.short }}</span>
          </div>
          <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 16 16" :class="{ rotated: showSortDropdown }">
            <path fill="currentColor" d="M4.427 9.573L8 6l3.573 3.573a.5.5 0 0 0 .708-.708L8.354 5.146a.5.5 0 0 0-.708 0L3.719 8.865a.5.5 0 1 0 .708.708z"/>
          </svg>
        </div>
        <div v-if="showSortDropdown" class="sort-dropdown-menu">
          <div 
            v-for="option in sortOptions" 
            :key="option.value"
            :class="['sort-option', { active: sortBy === option.value }]"
            @click="selectSortOption(option.value)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" v-html="option.icon"></svg>
            <span>{{ option.label }}</span>
            <svg v-if="sortBy === option.value" class="check-icon" width="12" height="12" viewBox="0 0 16 16">
              <path fill="currentColor" d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
          </div>
        </div>
      </div>
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
          @click="openFolder(folder)"
        >
          <div class="folder-icon" :style="{ backgroundColor: folder.color }">
            {{ folder.icon || '📁' }}
          </div>
          <div class="folder-info">
            <div class="folder-name">{{ folder.name }}</div>
            <div class="folder-path">{{ folder.path }}</div>
            <div v-if="folder.access_count > 0" class="folder-stats">
              <span class="access-count">访问 {{ folder.access_count }} 次</span>
              <span v-if="folder.last_accessed" class="last-accessed">
                最近: {{ formatLastAccessed(folder.last_accessed) }}
              </span>
            </div>
          </div>
          <div v-if="sortBy === 'smart' && folder.smart_score > 0" class="smart-score">
            {{ folder.smart_score.toFixed(1) }}
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
          <path d="M8 3V1L5 4L8 7V5C10.2 5 12 6.8 12 9S10.2 13 8 13S4 11.2 4 9H2C2 12.3 4.7 15 8 15S14 12.3 14 9S11.3 3 8 3Z" fill="currentColor"/>
        </svg>
        刷新
      </button>
      <button class="action-btn" @click="openHelp" title="功能介绍">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" fill="currentColor"/>
          <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z" fill="currentColor"/>
        </svg>
        介绍
      </button>
      <button class="action-btn" @click="openSettings" title="设置">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 0 0-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
        </svg>
        设置
      </button>
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
              <option value="soft-light">柔和亮色</option>
              <option value="soft-dark">柔和暗色</option>
              <option value="blue">蓝色主题</option>
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
            <label>添加文件夹快捷键</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input 
                type="text" 
                :value="isEditingAddFolderHotkey ? tempAddFolderHotkey : settings.addFolderHotkey"
                :readonly="!isEditingAddFolderHotkey"
                @keydown="captureAddFolderHotkey"
                @blur="cancelAddFolderHotkeyEdit"
                ref="addFolderHotkeyInput"
                placeholder="按下组合键..."
                style="flex: 1;"
              >
              <button 
                class="btn" 
                :class="isEditingAddFolderHotkey ? 'btn-cancel' : 'btn-save'"
                @click="toggleAddFolderHotkeyEdit"
                style="padding: 6px 12px; font-size: 12px;"
              >
                {{ isEditingAddFolderHotkey ? '取消' : '修改' }}
              </button>
            </div>
          </div>
          <div class="setting-item" v-if="platform === 'win32'">
            <label>
              <input 
                type="checkbox" 
                v-model="settings.contextMenuEnabled" 
                @change="toggleContextMenu"
              />
              Windows右键菜单集成
            </label>
            <small>在文件夹右键菜单中添加"添加到项目"选项</small>
            <small style="color: #ff9800; margin-top: 4px; display: block;">⚠️ 需要管理员权限：请以管理员身份运行应用程序</small>
          </div>
          <div class="setting-item">
            <label>应用更新</label>
            <div class="update-info-container">
              <div class="update-status">
                {{ updateInfo.available ? `发现新版本 ${updateInfo.version}` : '当前版本已是最新' }}
              </div>
              <div class="update-actions">
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
          </div>
          <div class="setting-item">
            <label>使用统计</label>
            <div class="stats-container" v-if="accessStats">
              <div class="stats-item">
                <span class="stats-label">总文件夹数:</span>
                <span class="stats-value">{{ accessStats.total_folders }}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">总访问次数:</span>
                <span class="stats-value">{{ accessStats.total_accesses || 0 }}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">平均访问次数:</span>
                <span class="stats-value">{{ (accessStats.avg_accesses || 0).toFixed(1) }}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">已访问文件夹:</span>
                <span class="stats-value">{{ accessStats.accessed_folders || 0 }}</span>
              </div>
            </div>
          </div>
          <div class="setting-item">
            <label>项目信息</label>
            <div class="project-info-container">
              <div class="project-description">
                智能文件夹启动器 v2.1.0 - 基于 Electron + Vue 3 开发
              </div>
              <div class="project-actions">
                <button 
                  class="btn btn-save"
                  @click="openGitHubRepo"
                  style="padding: 6px 12px; font-size: 12px;"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" style="margin-right: 4px;">
                    <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                  访问 GitHub
                </button>
                <button 
                  class="btn btn-save"
                  @click="openIssues"
                  style="padding: 6px 12px; font-size: 12px;"
                >
                  反馈问题
                </button>
              </div>
            </div>
          </div>
          <div class="setting-actions">
            <button class="btn btn-cancel" @click="closeSettings">取消</button>
            <button class="btn btn-save" @click="saveSettings">保存设置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能介绍弹窗 -->
    <div v-if="showHelp" class="settings-overlay" @click="closeHelp">
      <div class="settings-panel" @click.stop style="width: 480px; max-height: 85vh;">
        <div class="settings-header">
          <h3>功能介绍</h3>
          <button class="close-settings" @click="closeHelp">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div class="settings-content" style="padding: 24px;">
          <div class="help-section">
            <h4>🧠 智能排序算法 v2.1</h4>
            <p>系统采用全新优化的多因子加权算法，更智能地分析和学习您的使用习惯：</p>
            
            <h5>📊 算法核心公式</h5>
            <div class="formula-container">
              <code>智能分数 = 访问频率权重(40%) + 时间衰减权重(30%) + 累积分数权重(30%)</code>
            </div>
            
            <h5>🔬 权重分配详解</h5>
            <ul>
              <li><strong>访问频率权重 (40%)</strong>：基于访问次数的基础分数，反映使用频率</li>
              <li><strong>时间衰减权重 (30%)</strong>：使用指数衰减函数 exp(-天数差/30)，更自然的时间权重</li>
              <li><strong>累积分数权重 (30%)</strong>：结合频率和时间的综合历史评分</li>
            </ul>
            
            <h5>⚡ 算法优化特性</h5>
            <ul>
              <li><strong>指数衰减函数</strong>：替代线性衰减，提供更自然平滑的时间权重计算</li>
              <li><strong>平滑过渡机制</strong>：避免分数突变，确保排序稳定性和用户体验</li>
              <li><strong>长期记忆保持</strong>：高频文件夹即使长时间未访问也能保持合理排名</li>
              <li><strong>智能学习适应</strong>：算法会根据使用模式自动调整，越用越智能</li>
              <li><strong>新鲜度平衡</strong>：最近访问的文件夹获得合理的排名提升，但不会过度影响整体排序</li>
            </ul>
            
            <h5>🎯 实际应用效果</h5>
            <p><strong>💡 智能特性</strong>：新算法完美平衡了访问频率和时间新鲜度，确保：</p>
            <ul>
              <li>常用文件夹稳定排在前面，不会因偶尔未使用而大幅下降</li>
              <li>最近访问的文件夹获得合理提升，便于快速访问</li>
              <li>避免了旧算法中的分数波动和排序不稳定问题</li>
              <li>提供更符合人类使用习惯的智能排序体验</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h4>🎯 多样化排序方式</h4>
            <p>在界面右上角的下拉选择器中可以切换不同的排序方式：</p>
            <ul>
              <li><strong>🧠 智能排序</strong>：基于优化算法的智能排序，推荐日常使用</li>
              <li><strong>🔥 访问频率</strong>：按访问次数从高到低排序，查看最常用文件夹</li>
              <li><strong>⏰ 最近访问</strong>：按最后访问时间排序，快速找到最近使用的文件夹</li>
              <li><strong>📝 名称排序</strong>：按文件夹名称字母顺序排序，便于查找特定文件夹</li>
              <li><strong>📅 创建时间</strong>：按添加到应用的时间排序，查看添加历史</li>
            </ul>
            
            <h5>🎨 界面优化</h5>
            <ul>
              <li><strong>下拉选择器</strong>：优化的排序选择界面，节省空间提升体验</li>
              <li><strong>响应式布局</strong>：支持窗口大小调整，适应不同使用场景</li>
              <li><strong>智能分数显示</strong>：在智能排序模式下实时显示文件夹分数</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h4>📊 使用统计与数据分析</h4>
            <p>应用会智能记录和分析您的使用习惯，提供详细的统计信息：</p>
            
            <h5>📈 统计数据收集</h5>
            <ul>
              <li><strong>访问记录</strong>：每次打开文件夹都会自动记录访问次数和时间</li>
              <li><strong>使用模式</strong>：分析访问频率和时间分布，优化智能排序</li>
              <li><strong>实时更新</strong>：统计数据实时更新，智能分数动态计算</li>
            </ul>
            
            <h5>📋 统计信息查看</h5>
            <ul>
              <li><strong>总体统计</strong>：在设置页面查看总文件夹数、总访问次数等</li>
              <li><strong>个别统计</strong>：文件夹项显示访问次数和最后访问时间</li>
              <li><strong>分数显示</strong>：智能排序模式下显示实时计算的智能分数</li>
              <li><strong>趋势分析</strong>：通过颜色深浅反映不同文件夹的使用频率</li>
            </ul>
            
            <h5>💾 数据管理</h5>
            <ul>
              <li><strong>自动备份</strong>：访问记录自动备份，防止数据丢失</li>
              <li><strong>数据导出</strong>：支持导出使用统计数据为CSV格式</li>
              <li><strong>选择性清除</strong>：可选择性清除历史数据，重新开始统计</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h4>⌨️ 快捷键</h4>
            <ul>
              <li><strong>Alt + F</strong>：显示/隐藏主窗口</li>
              <li><strong>Ctrl + Alt + A</strong>：快速添加文件夹</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h4>🎨 主题与界面定制</h4>
            <p>应用提供丰富的主题选择和界面定制选项：</p>
            
            <h5>🌈 多样主题选择</h5>
            <ul>
              <li><strong>经典主题</strong>：浅色主题、深色主题，适应不同使用环境</li>
              <li><strong>彩色主题</strong>：蓝色、绿色、紫色、橙色主题，个性化体验</li>
              <li><strong>柔和主题</strong>：柔和暗色、柔和亮色主题，护眼舒适</li>
            </ul>
            
            <h5>🖼️ 界面特性</h5>
            <ul>
              <li><strong>毛玻璃效果</strong>：现代化的半透明界面设计</li>
              <li><strong>响应式布局</strong>：支持窗口大小调整，默认450x600尺寸</li>
              <li><strong>拖拽调整</strong>：用户可自定义窗口大小，适应不同屏幕</li>
              <li><strong>优雅动画</strong>：平滑的过渡动画和交互反馈</li>
            </ul>
            
            <h5>⚙️ 个性化设置</h5>
            <ul>
              <li><strong>主题切换</strong>：在设置页面一键切换不同主题</li>
              <li><strong>颜色标识</strong>：为文件夹设置自定义颜色标识</li>
              <li><strong>布局优化</strong>：下拉选择器等界面元素的优化设计</li>
            </ul>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      folders: [],
      searchQuery: '',
      sortBy: 'smart',
      showSettings: false,
      showEditDialog: false,
      showHelp: false,
      showSortDropdown: false,
      editingFolder: {
        id: null,
        name: '',
        path: '',
        color: '#007acc'
      },
      settings: {
        theme: 'light',
        showOnStartup: true,
        globalHotkey: 'Ctrl+Alt+F',
        addFolderHotkey: 'Ctrl+Alt+A',
        contextMenuEnabled: false
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
      isEditingAddFolderHotkey: false,
      tempAddFolderHotkey: '',
      colorOptions: [
        '#007acc', '#ff6b6b', '#4ecdc4', '#45b7d1',
        '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff',
        '#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe'
      ],

      accessStats: null,
      sortOptions: [
        {
          value: 'smart',
          label: '智能排序',
          short: '智能',
          icon: '<path fill="currentColor" d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 1a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm0 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm0 1a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>'
        },
        {
          value: 'frequency',
          label: '访问频率',
          short: '频率',
          icon: '<path fill="currentColor" d="M2 2h2v12H2V2zm4 4h2v8H6V6zm4-2h2v10h-2V4zm4 6h2v4h-2v-4z"/>'
        },
        {
          value: 'recent',
          label: '最近访问',
          short: '最近',
          icon: '<path fill="currentColor" d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 1a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm0 1v4.5l3.5 2-.5.866L7 9V4h1z"/>'
        },
        {
          value: 'name',
          label: '名称排序',
          short: '名称',
          icon: '<path fill="currentColor" d="M2 3h12v2H2V3zm0 4h8v2H2V7zm0 4h4v2H2v-2z"/>'
        },
        {
          value: 'created',
          label: '创建时间',
          short: '创建',
          icon: '<path fill="currentColor" d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 2v8h8V4H4zm2 2h4v1H6V6zm0 2h4v1H6V8z"/>'
        }
      ]
    }
  },
  computed: {
    currentSortOption() {
      return this.sortOptions.find(option => option.value === this.sortBy) || this.sortOptions[0]
    },
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
    
    // 检查Windows右键菜单状态
    await this.checkContextMenuStatus()
    
    // 点击其他地方隐藏下拉菜单
    document.addEventListener('click', this.hideSortDropdown)
    
    // 监听主进程发送的设置页面事件
    if (window.electronAPI && window.electronAPI.onOpenSettings) {
      window.electronAPI.onOpenSettings(() => {
        this.showSettings = true
      })
    }
    
    // 监听文件夹添加事件，自动刷新列表
    if (window.electronAPI && window.electronAPI.onFolderAdded) {
      window.electronAPI.onFolderAdded(() => {
        this.loadFolders()
      })
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.hideSortDropdown)
  },
  methods: {
    async loadFolders() {
      try {
        this.folders = await window.electronAPI.getFolders(this.sortBy)
      } catch (error) {
        console.error('加载文件夹失败:', error)
      }
    },
    
    async changeSortBy(sortType) {
      this.sortBy = sortType
      this.loadFolders()
    },
    
    toggleSortDropdown() {
      this.showSortDropdown = !this.showSortDropdown
    },
    
    selectSortOption(sortType) {
      this.changeSortBy(sortType)
      this.showSortDropdown = false
    },
    
    hideSortDropdown(event) {
      // 如果点击的是下拉选择器本身，不隐藏
      if (event.target.closest('.sort-dropdown-container')) {
        return
      }
      this.showSortDropdown = false
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
    
    async openFolder(folder) {
      try {
        // 记录访问
        await window.electronAPI.recordAccess(folder.id)
        
        // 打开文件夹
        await window.electronAPI.openFolder(folder.path)
        
        // 重新加载文件夹列表以更新访问统计
        await this.loadFolders()
        
        // 不再自动隐藏窗口，让用户手动控制
      } catch (error) {
        console.error('打开文件夹失败:', error)
      }
    },
    
    formatLastAccessed(dateString) {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      
      if (diffDays > 0) {
        return `${diffDays}天前`
      } else if (diffHours > 0) {
        return `${diffHours}小时前`
      } else if (diffMinutes > 0) {
        return `${diffMinutes}分钟前`
      } else {
        return '刚刚'
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
    },
    
    editFolder(folder) {
      this.editingFolder = {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        color: folder.color || '#007acc'
      }
      this.showEditDialog = true
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
    
    async openSettings() {
      this.showSettings = true
      // 加载访问统计数据
      try {
        this.accessStats = await window.electronAPI.getAccessStats()
      } catch (error) {
        console.error('加载访问统计失败:', error)
      }
    },
    
    closeSettings() {
      this.showSettings = false
    },
    
    openHelp() {
      this.showHelp = true
    },
    
    closeHelp() {
      this.showHelp = false
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
        
        // 更新主进程的添加文件夹快捷键
        if (window.electronAPI && window.electronAPI.updateAddFolderHotkey) {
          const result = await window.electronAPI.updateAddFolderHotkey(this.settings.addFolderHotkey)
          if (!result.success) {
            alert(`添加文件夹快捷键设置失败: ${result.message}`)
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
      // 移除所有主题类
      const themeClasses = ['dark-theme', 'blue-theme', 'soft-dark-theme', 'soft-light-theme']
      themeClasses.forEach(theme => {
        document.body.classList.remove(theme)
      })
      
      // 应用当前主题
      if (this.settings.theme && this.settings.theme !== 'light') {
        document.body.classList.add(`${this.settings.theme}-theme`)
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
          
          // 如果有保存的添加文件夹快捷键设置，应用到主进程
          if (this.settings.addFolderHotkey && this.settings.addFolderHotkey !== 'Ctrl+Alt+A') {
            if (window.electronAPI && window.electronAPI.updateAddFolderHotkey) {
              await window.electronAPI.updateAddFolderHotkey(this.settings.addFolderHotkey)
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

    toggleAddFolderHotkeyEdit() {
      if (this.isEditingAddFolderHotkey) {
        // 取消编辑
        this.isEditingAddFolderHotkey = false
        this.tempAddFolderHotkey = ''
      } else {
        // 开始编辑
        this.isEditingAddFolderHotkey = true
        this.tempAddFolderHotkey = ''
        this.$nextTick(() => {
          this.$refs.addFolderHotkeyInput?.focus()
        })
      }
    },

    captureAddFolderHotkey(event) {
      if (!this.isEditingAddFolderHotkey) return
      
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
        this.tempAddFolderHotkey = hotkey
        
        // 自动保存新的快捷键
        setTimeout(() => {
          this.settings.addFolderHotkey = hotkey
          this.isEditingAddFolderHotkey = false
          this.tempAddFolderHotkey = ''
        }, 100)
      } else {
        // 显示当前按下的修饰键
        this.tempAddFolderHotkey = keys.join('+') + (keys.length > 0 ? '+' : '')
      }
    },

    cancelAddFolderHotkeyEdit() {
      setTimeout(() => {
        this.isEditingAddFolderHotkey = false
        this.tempAddFolderHotkey = ''
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
            this.updateInfo.available = false
            alert(result.message || '当前已是最新版本')
          }
        } else {
          this.updateInfo.available = false
          alert(result.message || '检查更新失败')
        }
      } catch (error) {
        console.error('检查更新失败:', error)
        this.updateInfo.available = false
        alert('检查更新失败，请重试')
      } finally {
        this.updateInfo.checking = false
      }
    },

    // 检查右键菜单状态
    async checkContextMenuStatus() {
      if (this.platform === 'win32') {
        try {
          const result = await window.electronAPI.isContextMenuRegistered()
          if (result.success) {
            this.settings.contextMenuEnabled = result.data
          }
        } catch (error) {
          console.error('检查右键菜单状态失败:', error)
        }
      }
    },

    // 切换右键菜单
    async toggleContextMenu() {
      if (this.platform !== 'win32') {
        return
      }

      try {
        let result
        if (this.settings.contextMenuEnabled) {
          result = await window.electronAPI.registerContextMenu()
        } else {
          result = await window.electronAPI.unregisterContextMenu()
        }

        if (result.success) {
          this.showNotification(result.message, 'success')
          // 保存设置
          await window.electronAPI.saveSetting('contextMenuEnabled', this.settings.contextMenuEnabled)
        } else {
          // 操作失败，恢复状态
          this.settings.contextMenuEnabled = !this.settings.contextMenuEnabled
          
          // 检查是否是权限问题
          if (result.message && result.message.includes('管理员权限')) {
            this.showNotification(result.message + '\n\n提示：右键点击应用程序图标，选择"以管理员身份运行"', 'error', 8000)
          } else {
            this.showNotification(result.message || '操作失败', 'error')
          }
        }
      } catch (error) {
        console.error('切换右键菜单失败:', error)
        // 操作失败，恢复状态
        this.settings.contextMenuEnabled = !this.settings.contextMenuEnabled
        this.showNotification('操作失败：' + (error.message || '未知错误'), 'error')
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
    },

    openGitHubRepo() {
      // 打开GitHub仓库页面
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal('https://github.com/cuber-hyk/SmarterFolderLaucher')
      } else {
        // 备用方案
        window.open('https://github.com/cuber-hyk/SmarterFolderLaucher', '_blank')
      }
    },

    openIssues() {
      // 打开GitHub Issues页面
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal('https://github.com/cuber-hyk/SmarterFolderLaucher/issues')
      } else {
        // 备用方案
        window.open('https://github.com/cuber-hyk/SmarterFolderLaucher/issues', '_blank')
      }
    }
  }
}
</script>