import type { Metadata } from "next";
import PWARegister from "@/app/components/PWARegister";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
