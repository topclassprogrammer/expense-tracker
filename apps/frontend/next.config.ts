import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // shared публикуется как workspace-пакет и компилируется вместе с приложением
  transpilePackages: ['@expense-tracker/shared'],
};

export default nextConfig;
