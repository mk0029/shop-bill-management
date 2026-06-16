import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DataProvider } from "../components/providers/data-provider";
import { SanityRealtimeProvider } from "../components/providers/SanityRealtimeProvider";
import AuthBackgroundGate from "../components/providers/auth-background-gate";

import { Toaster } from "sonner";
import Script from "next/script";
import OfflineSync from "../components/pwa/offline-sync";
import OfflineWarning from "../components/pwa/offline-warning";
import AuthPrehydrate from "../components/providers/auth-prehydrate";
import AuthRoleSync from "../components/providers/auth-role-sync";
import BackgroundFeaturesGate from "../components/providers/background-features-gate";
import ServiceWorkerUpdatePrompt from "@/components/providers/service-worker-update-prompt";

import "./globals.css";
import RouteProgress from "../components/ui/route-progress";
import NotificationToaster from "../components/notifications/NotificationToaster";
import ForegroundSystemNotifier from "../notifications/components/ForegroundSystemNotifier";
import ClientErrorLogger from "@/components/providers/client-error-logger";

// Enable ISR by default for server components
export const revalidate = 60; // Rebuild at most once per 60s; tune per route as needed

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jambh Electric",
    template: "%s | Jambh Electric",
  },
  description: "Jambh Electric Billing System For All Customers.",
  applicationName: "Jambh Electric",
  keywords: [
    "Jambh Electric",
    "Electrician Shop",
    "Billing",
    "Invoices",
    "Inventory",
    "Customer Management",
    "Sanity CMS",
    "Next.js",
    "Shop Management",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/je-32.ico", sizes: "32x32", type: "image/x-icon" },
      {
        url: "/je-48.ico",
        sizes: "48x48 64x64 96x96 128x128 256x256",
        type: "image/x-icon",
      },
      { url: "/je-192.ico", sizes: "192x192", type: "image/x-icon" },
      { url: "/je-512.ico", sizes: "512x512", type: "image/x-icon" },
    ],
    apple: [{ url: "/je-p-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: ["/je-32.ico"],
  },
  openGraph: {
    title: "Jambh Electric",
    description: "Jambh Electric Billing System For All Customers.",
    url: "https://jambh-ell.vercel.app/",
    siteName: "Jambh Electric",
    images: [
      { url: "/je-p-512.png", width: 512, height: 512, alt: "Jambh Electric" },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jambh Electric",
    description: "Jambh Electric Billing System For All Customers.",
    images: ["/je-p-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jambh Electric",
  },
  verification: GOOGLE_SITE_VERIFICATION
    ? { google: GOOGLE_SITE_VERIFICATION }
    : undefined,
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Synchronous auth prehydration to speed up startup */}
        <AuthPrehydrate />
        <ClientErrorLogger />
        {/* Role revalidation to handle server-side role changes without re-login */}
        <AuthRoleSync />
        {/* Global route progress bar */}
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <DataProvider>
          <SanityRealtimeProvider>
            {children}
            <ServiceWorkerUpdatePrompt />
            <AuthBackgroundGate>
              <BackgroundFeaturesGate />
              {/* <PWAInstaller /> */}
              <OfflineSync />
              <OfflineWarning />
            </AuthBackgroundGate>
          </SanityRealtimeProvider>
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

        {/* Google Analytics 4 (optional via NEXT_PUBLIC_GA_ID) */}
        {GA_ID ? (
          <>
            <Script
              id="ga4-src"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);} 
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', { anonymize_ip: true });
                `}
            </Script>
          </>
        ) : null}

        {/* Structured Data: Organization and WebSite */}
        <Script
          id="ld-json-org"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Jambh Electrics",
            url: SITE_URL,
            logo: `${SITE_URL}/je-p-512.png`,
          })}
        </Script>
        <Script
          id="ld-json-website"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Jambh Electrics",
            url: SITE_URL,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          })}
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
  );
}
