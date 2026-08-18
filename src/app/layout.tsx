import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { PhotoEvidenceCapture } from "@/components/photo-evidence-capture";
import { CloudSyncBootstrap } from "@/components/cloud-sync-bootstrap";
import { CloudSyncDock } from "@/components/cloud-sync-dock";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WTF STUPID SIMPLE",
  description: "HVAC — Learn It. Note It. Fix It.",
  applicationName: "WTF STUPID SIMPLE",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WTF STUPID SIMPLE",
  },
};

export const viewport: Viewport = {
  themeColor: "#111820",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Register PWA service worker — must be in head so it loads early */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(()=>{}); }); }`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CloudSyncBootstrap />
        <PhotoEvidenceCapture />
        {children}
        <CloudSyncDock />
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
