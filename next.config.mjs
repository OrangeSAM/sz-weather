/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出配置（用于 GitHub Pages）
  output: 'export',
  // 静态资源路径前缀
  basePath: process.env.NODE_ENV === 'production' ? '/sz-weather' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
