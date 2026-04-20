/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };

    // Prevent webpack from splitting @zama-fhe/sdk into a separate
    // async chunk — its WASM worker deps break when code-split
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        cacheGroups: {
          .../** @type {object} */ (config.optimization?.splitChunks)?.cacheGroups,
          zamaSDK: {
            test: /[\\/]node_modules[\\/]@zama-fhe[\\/]/,
            name: "zama-sdk",
            chunks: "all",
            enforce: true,
          },
        },
      },
    };

    return config;
  },
};

export default nextConfig;
