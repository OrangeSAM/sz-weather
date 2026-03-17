/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {
  // 强制使用 webpack 而不是 Turbopack
  turbopack: {},
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
