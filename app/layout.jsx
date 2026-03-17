import "./globals.css";

export const metadata = {
  title: "深圳天气实景监测",
  description: "实时查看深圳市气象局13个监控点位的天气画面",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#0a1428" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
