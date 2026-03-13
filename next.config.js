/**
 * Next.js 构建配置
 *
 * 说明：
 * - output=standalone：输出可独立部署的产物（适合 Docker）
 * - ignoreBuildErrors：构建时忽略 TS 错误
 * - turbopack: {}：显式声明使用 Turbopack，避免 Next 16 在存在 webpack 配置时直接报错
 * - webpack alias：禁用 Node 侧原生依赖，兼容部分 AI/推理库在当前环境的打包
 */

/** @type {import('next').NextConfig} */
const pkg = require('./package.json');

const nextConfig = {
    // 生成 standalone 输出，便于容器化部署
    output: 'standalone',

    env: {
        NEXT_PUBLIC_APP_VERSION: pkg.version,
    },

    // 显式声明 Turbopack 配置，避免 Next 16 默认行为与 webpack 扩展冲突
    turbopack: {},

    // 构建阶段忽略 TypeScript 类型错误
    typescript: {
        ignoreBuildErrors: true,
    },

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
