import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { DataProvider } from "../components/providers/data-provider";

import { Toaster } from "sonner";
import Script from "next/script";
import OfflineSync from "../components/pwa/offline-sync";
import OfflineWarning from "../components/pwa/offline-warning";
import AuthPrehydrate from "../components/providers/auth-prehydrate";
import NotificationsBridge from "../components/realtime/notifications-bridge";
import AutoNotifications from "../notifications/components/AutoNotifications";
import EnableNotificationsPrompt from "../notifications/components/EnableNotificationsPrompt";

import "./globals.css";
import RouteProgress from "../components/ui/route-progress";
import NotificationToaster from "../components/notifications/NotificationToaster";
import ForegroundSystemNotifier from "../notifications/components/ForegroundSystemNotifier";

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jambh-ell.vercel.app"),
  title: "Jambh Electrics",
  description: "Professional Jambh Electrics system",
  manifest: "/manifest.webmanifest",
  themeColor: "#0ea5e9",
  icons: {
    icon: [
      { url: "/je-32.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/je-48.ico", sizes: "48x48 64x64 96x96 128x128 256x256", type: "image/x-icon" },
      { url: "/je-192.ico", sizes: "192x192", type: "image/x-icon" },
      { url: "/je-512.ico", sizes: "512x512", type: "image/x-icon" },
    ],
    apple: [
      { url: "/je-p-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: ["/je-32.ico"],
  },
  openGraph: {
    title: "Jambh Electrics",
    description: "Professional Jambh Electrics system",
    url: "https://jambh-ell.vercel.app/",
    siteName: "Jambh Electrics",
    images: [
      { url: "/je-p-512.png", width: 512, height: 512, alt: "Jambh Electrics" }
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jambh Electrics",
    description: "Professional Jambh Electrics system",
    images: ["/je-p-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jambh Electrics",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}>
          {/* Synchronous auth prehydration to speed up startup */}
          <AuthPrehydrate />
          {/* Global route progress bar */}
          <RouteProgress />
          <DataProvider>
            {children}
            {/* Global realtime notifications bridge */}
            <NotificationsBridge />
            {/* Headless FCM auto-setup (no UI) */}
            <AutoNotifications />
            {/* Foreground FCM -> system notifications */}
            <ForegroundSystemNotifier />
            {/* Prompt to enable notifications until granted */}
            <EnableNotificationsPrompt />
            {/* In-app toast + sound on new notifications */}
            <NotificationToaster />
            {/* <PWAInstaller /> */}
            <OfflineSync />
            <OfflineWarning />
          </DataProvider>

          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#1f2937",
                border: "1px solid #374151",
                color: "#f9fafb",
              },
            }}
          />

          {/* Register Service Worker (single entry: firebase-messaging-sw.js delegates to /sw.js) */}
          <Script id="register-sw" strategy="afterInteractive">
            {`
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  const swUrl = '/firebase-messaging-sw.js';
                  navigator.serviceWorker.register(swUrl).then((reg) => {
                    // Listen for updates
                    reg.addEventListener('updatefound', () => {
                      const newWorker = reg.installing;
                      if (!newWorker) return;
                      newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          // new content available; could notify user
                        }
                      });
                    });
                  }).catch(() => {
                    // registration failed; ignore
                  });
                });
              }
            `}
          </Script>

          <Script id="disable-number-input-scroll" strategy="afterInteractive">
            {`
              function disableNumberInputScroll() {
                const numberInputs = document.querySelectorAll('input[type="number"]');
                
                numberInputs.forEach(input => {
                  // Remove existing listeners if any
                  input.removeEventListener('wheel', preventScroll);
                  // Add the event listener
                  input.addEventListener('wheel', preventScroll, { passive: false });
                });
              }
              
              function preventScroll(e) {
                e.preventDefault();
                e.stopPropagation();
              }
              
              // Run on initial load
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', disableNumberInputScroll);
              } else {
                disableNumberInputScroll();
              }
              
              // Also run when new content is added (for dynamic content)
              const observer = new MutationObserver(() => {
                disableNumberInputScroll();
              });
              
              observer.observe(document.body, {
                childList: true,
                subtree: true
              });
            `}
          </Script>
        </body>
      </html>
    </ClerkProvider>
  );
}