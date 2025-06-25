/** @type {import('next').NextConfig} */
const nextcloudUrl = process.env.NEXTCLOUD_URL
const nextcloudDomain = nextcloudUrl ? new URL(nextcloudUrl).hostname : undefined

const nextConfig = {
  images: {
    domains: nextcloudDomain ? [nextcloudDomain] : [],
  },
  // Разрешаем загрузку файлов определенных типов
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false }
    return config
  },
}
  
  
export default nextConfig;
