# 深圳天气实景监测

Real-time weather camera monitoring for Shenzhen, displaying live video feeds from 13 weather stations across the city.

## Features

- **13 Weather Cameras** - Watch live conditions across Shenzhen including Futian, Luohu, Shekou, Xichong, and more
- **24-Hour Playback** - Browse historical footage from the past 24 hours via an interactive timeline
- **Video Download** - Download current or historical video clips directly
- **PWA Support** - Install as a desktop or mobile app for quick access
- **Auto-Refresh** - Automatically loads new footage as it becomes available

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: CSS Variables with "Weather Control Room" aesthetic
- **Analytics**: Vercel Analytics
- **PWA**: next-pwa

## Project Structure

```
sz-weather/
├── app/
│   ├── api/download/route.js   # Video download proxy (CORS workaround)
│   ├── globals.css            # Global styles
│   ├── layout.jsx             # Root layout with PWA meta tags
│   └── page.jsx               # Main page
├── components/
│   ├── Header.jsx            # Header with live status indicator
│   ├── VideoPlayer.jsx        # Video playback with auto-refresh
│   ├── VideoTimeline.jsx     # 24-hour timeline scrubber
│   ├── CameraTabs.jsx        # Camera selection tabs
│   ├── WeatherBar.jsx        # Weather info bar
│   └── AboutPanel.jsx        # About modal with QR codes
├── lib/
│   └── cameras.js            # Camera configs and utilities
└── public/
    ├── icons/                # PWA icons
    ├── gzh.jpg               # WeChat Official Account QR
    └── wxh.png               # WeChat QR
```

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deployed on Vercel. The `/api/download` route requires a serverless environment (not compatible with static export).

## Data Source

Video feeds from [Shenzhen Meteorological Bureau](https://weather.121.com.cn)

## License

MIT
