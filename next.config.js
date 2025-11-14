/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force standalone output (NOT export) for server-side features
  output: 'standalone',
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
}

module.exports = nextConfig
