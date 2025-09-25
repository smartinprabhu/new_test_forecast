/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyAhG6nkwRaeP_XoFfrKkSfBZItPDkvj7_g'
  }
}

module.exports = nextConfig