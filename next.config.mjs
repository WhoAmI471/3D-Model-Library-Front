/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: [],
    },
    // Разрешаем загрузку файлов определенных типов
    webpack: (config) => {
      config.resolve.fallback = { fs: false, path: false };
      return config;
    },
  };
  
  
export default nextConfig;
