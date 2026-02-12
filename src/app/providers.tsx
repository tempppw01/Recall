"use client";

/**
 * 全局 Providers 容器
 *
 * 当前仅注入 NextAuth 的 SessionProvider，
 * 便于在客户端任意组件中读取登录态。
 */
import { SessionProvider } from 'next-auth/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
