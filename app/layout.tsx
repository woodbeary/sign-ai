import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CursorControl } from "@/components/hand-tracking/cursor-control";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff'
}

export const metadata: Metadata = {
  title: {
    template: '%s | Sign AI',
    default: 'Sign AI - Learn Sign Language with AI'
  },
  description: 'Practice sign language alphabet with AI-powered hand tracking technology. Interactive, real-time feedback helps you learn at your own pace.',
  applicationName: 'Sign AI',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sign AI'
  },
  formatDetection: {
    telephone: false
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        {children}
        <CursorControl />
      </body>
    </html>
  );
}
