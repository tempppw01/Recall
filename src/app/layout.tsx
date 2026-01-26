import type { Metadata } from "next";
import PWARegister from "@/app/components/PWARegister";
import Providers from "@/app/providers";
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
        <Providers>
          <PWARegister />
          {children}
        </Providers>
        <footer className="app-footer">
          <div className="app-footer__content">
            <span>
              项目主页：
              <a
                href="https://github.com/tempppw01/Recall"
                target="_blank"
                rel="noreferrer"
              >
                https://github.com/tempppw01/Recall
              </a>
            </span>
            <span>微信：Ethan_BravoEcho</span>
            <span>版权所有 © Recall Team</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
