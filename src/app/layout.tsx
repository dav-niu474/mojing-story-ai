import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "墨境 · AI网文创作平台",
  description: "全流程AI辅助网文创作平台，支持世界观构建、大纲规划、智能写作与版本管理",
  keywords: ["网文", "AI写作", "小说创作", "世界观构建", "大纲", "墨境"],
  authors: [{ name: "墨境" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "墨境 · AI网文创作平台",
    description: "全流程AI辅助网文创作平台",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "墨境 · AI网文创作平台",
    description: "全流程AI辅助网文创作平台",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
