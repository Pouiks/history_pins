/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclure Leaflet du bundling côté serveur
    if (isServer) {
      config.externals = [...(config.externals || []), 'leaflet', 'react-leaflet'];
    }
    return config;
  },
}

module.exports = nextConfig

