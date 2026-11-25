# 深圳实时天象台（深圳天气实景监测）

通过深圳市气象局的 14 个气象监控点位实时观测深圳天色、能见度、日出日落与 24 小时连续延时回放。

## 功能特性

- **空间点位图与朝向视野（FOV）** - 基于深圳市轮廓矢量地图标注 14 个监控点位及镜头朝向扇形，支持按区域分组筛选
- **2×2 四宫格实景巡检** - 内置全城精选、日出追光、日落海湾、福田四向预设编组，支持同步历史时刻多视角对比
- **24 小时昼夜光谱时间轴** - 实时计算深圳东八区天文日出/日落与黄金窗口，自动探测可用分片，支持拖拽定位与正序连播（1x / 2x / 4x）
- **双缓冲无缝播放与明信片导出** - 支持跨机位时刻锁定、一键下载 MP4 片段，以及生成带时间/天气水印的「实景明信片」PNG
- **区域实况与气象预警** - 通过 `/api/weather` 服务端代理聚合和风天气区域实况、通透度建议与深圳市气象预警信号
- **昼夜双主题自适应** - 默认跟随系统在「日间纸本」与「夜间天文台」间自动切换，并支持手动舒适切换与三态设置
- **URL 状态直达与 PWA** - 支持 `?cam=209&t=YYYYMMDDHHMM&view=grid` 链接直接分享定位

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **样式**: 原生 CSS Variables、`light-dark()`、`color-scheme` 与无障碍 `<dialog>` / `role="toolbar"`
- **服务端接口 (BFF)**:
  - `/api/weather`: 和风天气实况与预警信号服务端缓存代理（保护 `QWEATHER_KEY`）
  - `/api/availability`: 服务端并发 `HEAD` 探测过去 24 小时分片可用性
  - `/api/download`: 流式视频下载与同源截图代理
- **统计**: Vercel Analytics

## 项目结构

```text
sz-weather/
├── app/
│   ├── api/
│   │   ├── availability/route.js  # 24 小时分片可用性探测
│   │   ├── download/route.js      # 视频流式下载与同源截图代理
│   │   └── weather/route.js       # 区域天气实况与预警 BFF 代理
│   ├── globals.css                # 昼夜双主题与响应式布局样式
│   ├── layout.jsx                 # 根布局与防闪烁主题脚本
│   └── page.jsx                   # 服务端入口（解析 URL Query）
├── components/
│   ├── AboutPanel.jsx             # 原生 <dialog> 关于、主题与快捷键弹窗
│   ├── Header.jsx                 # 顶部状态栏、视图切换与主题开关
│   ├── MultiCamGrid.jsx           # 2×2 四宫格实景巡检墙
│   ├── ObservatoryClient.jsx      # 客户端状态协调中心与快捷键绑定
│   ├── StationAtlas.jsx           # 深圳点位 FOV 地图与分区目录
│   ├── VideoPlayer.jsx            # 双缓冲播放器、工具栏与明信片导出
│   ├── VideoTimeline.jsx          # 昼夜光谱时间轴与快捷连播
│   └── WeatherBar.jsx             # 区域天气、预警与观景提示条
└── lib/
    ├── cameras.js                 # 14 个点位配置、东八区时间与 NOAA 天文算法
    ├── postcard.js                # Canvas 实景明信片绘制与导出
    └── theme.js                   # 昼夜主题状态管理
```

## 环境变量

在 `.env.local` 或 Vercel 环境变量中配置（服务端优先读取私有变量 `QWEATHER_HOST` / `QWEATHER_KEY`，兼容原有 `NEXT_PUBLIC_*` 变量）：

```bash
QWEATHER_HOST=https://your-qweather-host
QWEATHER_KEY=your_qweather_api_key
```

## 本地运行

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 部署

部署在 Vercel。`/api/weather`、`/api/availability` 与 `/api/download` 路由依赖 Serverless Node 运行时。

## 数据来源

- 实景视频来源：[深圳市气象局](https://weather.121.com.cn)
- 气象实况与预警：[和风天气](https://www.qweather.com)

## License

MIT
