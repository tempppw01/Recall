/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // 允许 transformers.js 在 node 环境下工作
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            "sharp$": false,
            "onnxruntime-node$": false,
        }
        return config;
    },
};

module.exports = nextConfig;
