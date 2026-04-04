/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk', 'pdf-parse'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' *.supabase.co data: blob:",
              "connect-src 'self' *.supabase.co https://api.anthropic.com https://api.openai.com https://api.stripe.com",
              "frame-src https://js.stripe.com",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ]
  },
  webpack: (config) => {
    // jsPDF y html2canvas requieren que canvas sea ignorado en el bundle de webpack 5
    config.resolve.alias.canvas = false
    return config
  },
}

module.exports = nextConfig
