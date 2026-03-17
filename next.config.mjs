/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {
  // 强制使用 webpack 而不是 Turbopack
  turbopack: {},
  // 静态导出配置（用于 GitHub Pages）
  output: 'export',
  // 静态资源路径前缀
  basePath: process.env.NODE_ENV === 'production' ? '/sz-weather' : '',
  images: {
    unoptimized: true,
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
