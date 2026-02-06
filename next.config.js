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
  transpilePackages: ['react-markdown', 'remark-gfm', 'micromark-extension-math', 'katex'],
  
  // Augmenter la limite de taille pour les uploads de PDF

  
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
  
  // Headers de sécurité et cache
  async headers() {
    const securityHeaders = [
      {
        // Protection contre le clickjacking
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        // Empêche le MIME type sniffing
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        // Protection XSS du navigateur
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        // Contrôle les informations de référence
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        // Permissions du navigateur
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(self), geolocation=()',
      },
    ]

    // Headers additionnels en production uniquement
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push(
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate',
        },
        {
          // Content Security Policy
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js nécessite unsafe-eval en dev
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.stripe.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
        {
          // Force HTTPS
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        }
      )
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = withNextIntl(nextConfig)

