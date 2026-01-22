import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recall - AI GTD",
  description: "AI-driven personal Getting Things Done system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
