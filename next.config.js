const withNextIntl = require("next-intl/plugin")("./i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode activé (peut causer des doubles renders en dev, mais c'est normal)
  reactStrictMode: true,
  
  // Optimisations pour la stabilité en développement
  experimental: {
    // Désactivé temporairement pour éviter les problèmes de vendor-chunks
    // optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
  },
  transpilePackages: ['react-markdown', 'remark-gfm'],
  
  // Désactiver le cache Turbopack si problématique (décommentez si nécessaire)
  // turbo: {},
  
  // Webpack config simplifiée pour éviter les problèmes de chunks récurrents
  webpack: (config, { dev, isServer }) => {
    // En développement, améliorer la stabilité du HMR
    if (dev && !isServer) {
      config.watchOptions = {
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      }
    }
    
    // Fallback pour les modules Node.js (nécessaire pour certains packages)
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    // Laisser Next.js gérer les chunks par défaut pour éviter les problèmes
    // Ne pas modifier splitChunks en développement - Next.js le gère mieux
    
    return config
  },
  
  // Headers pour éviter les problèmes de cache (seulement en production)
  async headers() {
    // Ne pas ajouter de headers en développement pour éviter les problèmes avec HMR
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=0, must-revalidate',
            },
          ],
        },
      ]
    }
    return []
  },
}

module.exports = withNextIntl(nextConfig)

