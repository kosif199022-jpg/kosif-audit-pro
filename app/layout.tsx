import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KOSIF Audit Studio Unified",
  description:
    "نظام تشغيل عربي لملف المراجعة المالية: جولات، أدلة، مخاطر، معايير، تحليل حتمي، وقرار بشري قابل للتتبع.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
