/**
 * Next.js 构建配置
 *
 * 说明：
 * - output=standalone：输出可独立部署的产物（适合 Docker）
 * - ignoreDuringBuilds / ignoreBuildErrors：构建时忽略 lint 与 TS 错误
 * - webpack alias：禁用 Node 侧原生依赖，兼容部分 AI/推理库在当前环境的打包
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
    // 生成 standalone 输出，便于容器化部署
    output: 'standalone',

    // 构建阶段忽略 ESLint 校验
    eslint: {
        ignoreDuringBuilds: true,
    },

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
