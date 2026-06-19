import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "刘子瑞的个人网站",
  description: "博客 · 语音 · 更多可能",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
