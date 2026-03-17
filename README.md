# 深圳天气监控 - Next.js 重构说明文档

## 项目结构

```
sz-weather-next/
├── app/
│   ├── layout.jsx      # 根布局（HTML结构、Meta标签、PWA配置）
│   ├── page.jsx        # 主页面（状态管理、组件组合）
│   └── globals.css     # 全局样式（深色主题、动画）
├── components/
│   ├── Header.jsx     # 顶部状态栏
│   ├── VideoPlayer.jsx # 视频播放器（核心逻辑）
│   └── CameraTabs.jsx # 摄像头选择标签
├── lib/
│   └── cameras.js     # 摄像头数据 + 工具函数
├── public/
│   ├── icons/         # PWA 图标
│   └── manifest.json  # PWA 配置文件
└── next.config.mjs    # Next.js 配置（PWA插件）
```

---

## 各部分实现

### 1. 摄像头数据 (`lib/cameras.js`)

存放所有摄像头配置和视频相关工具函数：

```javascript
// 摄像头列表（13个）
export const CAMERAS = [
    { id: 73, name: '福田东' },
    { id: 78, name: '福田西' },
    // ...
];

// 工具函数
getVideoTimestamp(timeSuffix)    // 计算当前视频时间戳
formatVideoTimestamp(date)       // 格式化为 YYYYMMDDHHMM
formatDisplayTime(date)          // 格式化为 HH:MM
getPreviousTimestamp(date)       // 获取上一个可用时间点
getVideoUrl(camera, timestamp)   // 生成视频URL
```

**为什么用 timeSuffix？**
- 大部分摄像头每20分钟更新一次视频（19/39/59）
- 部分摄像头是 18/38/58（蛇口码头、石岩观测场）

---

### 2. 根布局 (`app/layout.jsx`)

定义 HTML 结构和全局 Meta 标签：

```jsx
// PWA 相关
- apple-mobile-web-app-capable
- apple-mobile-web-app-status-bar-style
- theme-color
- manifest.json

// SEO
- title
- description
- lang="zh-CN"
```

---

### 3. 主页面 (`app/page.jsx`)

负责状态管理和组件组合：

```jsx
// 状态
const [currentCameraIndex, setCurrentCameraIndex] = useState(0)  // 当前摄像头
const [updateTime, setUpdateTime] = useState('--:--')             // 视频时间

// 渲染
<Header cameraName={...} updateTime={...} />
<VideoPlayer currentCameraIndex={...} onTimeUpdate={...} />
<CameraTabs currentCameraIndex={...} onCameraSelect={...} />
```

---

### 4. Header 组件 (`components/Header.jsx`)

纯展示组件，接收 props：
- `cameraName`: 当前摄像头名称
- `updateTime`: 视频时间
- `isLive`: 是否直播中（暂未使用）

---

### 5. VideoPlayer 组件 (`components/VideoPlayer.jsx`)

**核心逻辑组件**，处理视频播放：

```jsx
// 状态
const [isLoading, setIsLoading] = useState(true)   // 加载中
const [hasError, setHasError] = useState(false)    // 错误

// 主要功能
1. 初始化加载视频
2. 自动刷新（每20秒检查新视频）
3. 错误重试（最多2次，回退到上一个时间点）
4. 页面可见性处理（切后台时暂停）
5. 全屏控制
```

**视频加载流程：**
1. 计算当前时间戳 → 生成 URL
2. 显示 loading
3. 视频 canplay → 播放
4. 视频 error → 重试或显示错误

---

### 6. CameraTabs 组件 (`components/CameraTabs.jsx`)

纯展示组件，渲染摄像头列表：
- 从 `lib/cameras.js` 导入 `CAMERAS`
- 点击时调用 `onCameraSelect(index)` 回调

---

### 7. 样式 (`app/globals.css`)

保留了原来的深色主题样式：
- CSS Variables 定义颜色、间距
- 深空蓝配色（#050a14 背景）
- 青色强调色（#00d4ff）
- 动画效果（淡入、滑动）
- 响应式布局

---

## 常见操作

### 添加新摄像头

在 `lib/cameras.js` 的 `CAMERAS` 数组中添加：

```javascript
{ id: 新ID, name: '新名称', timeSuffix: 8 }  // 如果需要特殊时间戳
```

### 修改刷新间隔

在 `components/VideoPlayer.jsx` 中修改：

```javascript
setInterval(() => { ... }, 20000)  // 毫秒
```

### 添加新页面

在 `app/` 目录下创建新文件：
- `about/page.jsx` → /about
- `settings/page.jsx` → /settings

---

## TODO

- [ ] **多视频网格视图** - 同时展示多个摄像头画面（2x2 或 3x3）
- [ ] **日出日落推荐** - 自动检测并推荐最美的日出日落画面

---

## 下一步可以做的事

1. **地图功能** - 用 Leaflet.js 添加地图展示
2. **用户偏好** - 用 localStorage 保存最后选择的摄像头
3. **更丰富的主题** - 切换深浅色
4. **服务端渲染** - 静态生成预渲染首屏
