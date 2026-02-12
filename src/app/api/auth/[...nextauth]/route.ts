/**
 * NextAuth 认证路由处理器
 *
 * GET/POST /api/auth/[...nextauth]
 * 处理所有 NextAuth 相关请求（登录、登出、回调、CSRF 等）
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/** 使用统一的 authOptions 创建 NextAuth 处理器 */
const handler = NextAuth(authOptions);

/** Next.js App Router 要求分别导出 GET 和 POST */
export { handler as GET, handler as POST };
