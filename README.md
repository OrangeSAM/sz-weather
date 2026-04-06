# 深圳天气实景监测

通过深圳市气象局的 13 个气象站实时视频监测深圳天气状况。

## 功能特性

- **13 个气象摄像头** - 实时观测福田、罗湖、蛇口、西涌等多个点位的天气状况
- **24 小时回放** - 通过交互时间轴浏览过去 24 小时的录像
- **视频下载** - 直接下载当前或历史视频片段
- **PWA 支持** - 可作为桌面或移动应用快速访问
- **自动刷新** - 自动加载最新视频素材

## 技术栈

- **框架**: Next.js 16 (App Router)
- **样式**: CSS Variables，Weather Control Room 美学风格
- **统计**: Vercel Analytics
- **PWA**: next-pwa

## 项目结构

```
sz-weather/
├── app/
│   ├── api/download/route.js   # 视频下载代理（解决跨域）
│   ├── globals.css            # 全局样式
│   ├── layout.jsx             # 根布局（PWA Meta 标签）
│   └── page.jsx              # 主页面
├── components/
│   ├── Header.jsx            # 顶部状态栏（直播指示器）
│   ├── VideoPlayer.jsx       # 视频播放器（自动刷新）
│   ├── VideoTimeline.jsx     # 24 小时时间轴
│   ├── CameraTabs.jsx        # 摄像头选择标签
│   ├── WeatherBar.jsx        # 天气信息栏
│   └── AboutPanel.jsx        # 关于弹窗（二维码）
├── lib/
│   └── cameras.js            # 摄像头配置和工具函数
└── public/
    ├── icons/                # PWA 图标
    ├── gzh.jpg               # 公众号二维码
    └── wxh.png               # 微信二维码
```

## 本地运行

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 部署

部署在 Vercel。`/api/download` 路由需要 Serverless 环境（不支持静态导出）。

## 数据来源

视频素材来自[深圳市气象局](https://weather.121.com.cn)

## License

MIT