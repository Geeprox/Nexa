import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexa",
  description: "Branching LLM research workspace"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
