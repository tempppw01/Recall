/**
 * NextAuth 认证配置模块
 *
 * 使用 Credentials Provider（邮箱 + 密码）进行身份验证，
 * 通过 PrismaAdapter 将用户/会话等数据持久化到数据库，
 * 会话策略采用 JWT，无需服务端存储 session。
 */

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  /** 使用 Prisma 适配器，自动管理 User / Account / Session 等表 */
  adapter: PrismaAdapter(prisma),

  /** 会话策略：使用 JWT（无状态），而非数据库 session */
  session: {
    strategy: 'jwt',
  },

  providers: [
    /**
     * 邮箱 + 密码凭证登录
     * authorize 回调负责校验用户凭证，返回用户对象或 null
     */
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        // 校验必填字段
        if (!credentials?.email || !credentials?.password) return null;

        // 根据邮箱查找用户
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user?.passwordHash) return null;

        // 使用 bcrypt 比对密码哈希
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // 返回精简的用户对象，写入 JWT
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    /** 签发 JWT 时，将用户 ID 写入 token.sub */
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },

    /** 构建客户端 session 时，将 token 中的用户 ID 注入 session.user */
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },

  /** 自定义页面路由 */
  pages: {
    signIn: '/signin',
  },
};
