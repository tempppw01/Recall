/**
 * 应用根布局（App Router）
 *
 * - 注入全局样式
 * - 注入全局 Provider（NextAuth SessionProvider）
 * - 注入 PWA 注册组件
 * - 定义全站元信息（标题、描述、图标、manifest 等）
 */

import type { Metadata } from "next";
import PWARegister from "@/app/components/PWARegister";
import Providers from "@/app/providers";
import "./globals.css";

/** 全站元信息 */
export const metadata: Metadata = {
  title: "Recall - AI GTD",
  description: "AI-driven personal Getting Things Done system",
  manifest: "/manifest.webmanifest",
  themeColor: "#1A1A1A",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

/** 根布局组件，包裹所有页面内容 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <PWARegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
