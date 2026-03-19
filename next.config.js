/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  async rewrites() {
    return [
      // /spauth?license_code=  →  pages/api/spauth/index.js
      {
        source: '/spauth',
        destination: '/api/spauth',
      },
      // /spauth/spauth?license_code=  →  pages/api/spauth/spauth.js
      {
        source: '/spauth/spauth',
        destination: '/api/spauth/spauth',
      },
    ];
  },
};

module.exports = nextConfig;
