/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: '/fapi/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:5328/fapi/:path*'
            : '/fapi/',
      },
    ]
  },
}

module.exports = nextConfig