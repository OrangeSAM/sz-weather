import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata = {
    title: "深圳实时天象台 · 深圳天气实景监测",
    description: "通过深圳市气象局14个气象监控点位实时观测深圳天色、能见度、日出日落与24小时延时回放",
    manifest: "/manifest.json",
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

const THEME_INIT_SCRIPT = `
try {
  var saved = localStorage.getItem('color-scheme');
  if (saved === 'light' || saved === 'dark') {
    document.querySelector('meta[name="color-scheme"]').setAttribute('content', saved);
  }
} catch (e) {}
`;

export default function RootLayout({ children }) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <head>
                <meta name="color-scheme" content="light dark" />
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
                <meta name="theme-color" content="#f4f0e8" media="(prefers-color-scheme: light)" />
                <meta name="theme-color" content="#0f1419" media="(prefers-color-scheme: dark)" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            </head>
            <body>
                {children}
                <Analytics />
            </body>
        </html>
    );
}
