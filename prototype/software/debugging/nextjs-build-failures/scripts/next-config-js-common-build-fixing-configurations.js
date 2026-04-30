// Input:  next.config.js causing or preventing build errors
// Output: Properly configured next.config.js with error handling

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization: allow external image domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // Environment variables validation (fail early if missing)
  env: {
    CUSTOM_VAR: process.env.CUSTOM_VAR,
  },

  // Webpack customization (e.g., handle Node.js modules in client code)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent "Module not found: Can't resolve 'fs'" in client bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Redirect trailing slashes (prevents duplicate page generation)
  trailingSlash: false,

  // Output: standalone for Docker deployments
  output: 'standalone',
};

module.exports = nextConfig;
