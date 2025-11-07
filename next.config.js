/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode activé (peut causer des doubles renders en dev, mais c'est normal)
  reactStrictMode: true,
  
  // Optimisations pour la stabilité en développement
  experimental: {
    // Améliore la stabilité du HMR (Hot Module Replacement)
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
  },
  
  // Désactiver le cache Turbopack si problématique (décommentez si nécessaire)
  // turbo: {},
  
  // Webpack config pour la stabilité
  webpack: (config, { dev, isServer }) => {
    // En développement, améliorer la stabilité du HMR
    // Le polling est désactivé par défaut (utilise les événements système)
    // Si vous avez des problèmes de hot reload, décommentez les lignes ci-dessous
    if (dev && !isServer) {
      config.watchOptions = {
        // poll: 1000, // Décommenter si le hot reload ne fonctionne pas
        aggregateTimeout: 300, // Attendre 300ms après le dernier changement
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      }
    }
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

module.exports = nextConfig

