/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出配置（用于 GitHub Pages）
  output: 'export',
  // 自定义域名部署，无需 basePath
  basePath: '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
