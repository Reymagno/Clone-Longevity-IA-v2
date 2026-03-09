/** @type {import('next').NextConfig} */
const nextConfig = {
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
  webpack: (config) => {
    // jsPDF y html2canvas requieren que canvas sea ignorado en el bundle de webpack 5
    config.resolve.alias.canvas = false
    return config
  },
}

module.exports = nextConfig
