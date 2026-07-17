import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DataProvider } from "../components/providers/data-provider";
import { SanityRealtimeProvider } from "../components/providers/SanityRealtimeProvider";
import AuthBackgroundGate from "../components/providers/auth-background-gate";

import { Toaster } from "sonner";
import Script from "next/script";
import OfflineSync from "../components/pwa/offline-sync";
import PWAInstaller from "../components/pwa/pwa-installer";
import OfflineWarning from "../components/pwa/offline-warning";
import AuthPrehydrate from "../components/providers/auth-prehydrate";
import AuthRoleSync from "../components/providers/auth-role-sync";
import BackgroundFeaturesGate from "../components/providers/background-features-gate";
import ServiceWorkerUpdatePrompt from "@/components/providers/service-worker-update-prompt";
import { ConfirmModalProvider } from "@/components/providers/confirm-modal-provider";
import { ModalStackProvider } from "@/providers/ModalStackProvider";

import "./globals.css";
import RouteProgress from "../components/ui/route-progress";
import NotificationToaster from "../components/notifications/NotificationToaster";
import ForegroundSystemNotifier from "../notifications/components/ForegroundSystemNotifier";
import ClientErrorLogger from "@/components/providers/client-error-logger";
import AndroidBridgeProvider from "@/components/providers/android-bridge-provider";

// Enable ISR by default for server components
export const revalidate = 60;

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const BING_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

const verification: Record<string, string> = {};
if (GOOGLE_SITE_VERIFICATION) verification.google = GOOGLE_SITE_VERIFICATION;
if (BING_SITE_VERIFICATION) verification.msvalidate = BING_SITE_VERIFICATION;
const verificationObj = Object.keys(verification).length > 0
  ? { ...verification, yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined }
  : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jambh Electrics - Trusted Electrical Shop & Home Services",
    template: "%s | Jambh Electrics",
  },
  description: "Jambh Electrics — professional electrical products, home wiring, appliance repair, tool rental, and billing system in Siwani, Haryana.",
  applicationName: "Jambh Electrics",
  keywords: [
    "Jambh Electrics",
    "Electrical Shop",
    "Home Electrical Services",
    "Electrician Siwani",
    "Electrical Repair Haryana",
    "Wiring Services",
    "Tool Rental",
    "Appliance Repair",
    "Electrical Products",
    "Switchboard Installation",
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
    apple: [
      { url: "/je-p-192.png", sizes: "192x192", type: "image/png" },
      { url: "/je-p-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/je-32.ico"],
  },
  openGraph: {
    title: "Jambh Electrics - Trusted Electrical Shop & Home Services",
    description: "Professional electrical products, home wiring, appliance repair, tool rental, and more in Siwani, Haryana. Quality service since years.",
    url: SITE_URL,
    siteName: "Jambh Electrics",
    images: [
      { url: "/je-p-512.png", width: 512, height: 512, alt: "Jambh Electrics brand logo" },
    ],
    type: "website",
    locale: "en_US",
    alternateLocale: ["hi_IN"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jambh Electrics - Trusted Electrical Shop & Home Services",
    description: "Professional electrical products, home wiring, appliance repair, tool rental, and more in Siwani, Haryana.",
    images: ["/je-p-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jambh Electrics",
  },
  verification: verificationObj,
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
    languages: {
      "en": SITE_URL,
      "hi": `${SITE_URL}?lang=hi`,
    },
  },
  other: {
    "msvalidate.01": BING_SITE_VERIFICATION || "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://cdn.sanity.io" />
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.sanity.io" />
        <link rel="preconnect" href="https://*.supabase.co" />
        <link rel="dns-prefetch" href="https://*.supabase.co" />
        {GA_ID && (
          <>
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
            <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
            <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />
            <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          </>
        )}
      </head>
      <body className="bg-background text-foreground antialiased">
        {/* Skip to main content for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-md focus:bg-sky-500 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        >
          Skip to main content
        </a>
        {/* Synchronous auth prehydration to speed up startup */}
        <AuthPrehydrate />
        <ClientErrorLogger />
        <AndroidBridgeProvider />
        {/* Role revalidation to handle server-side role changes without re-login */}
        <AuthRoleSync />
        {/* Global route progress bar */}
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <ModalStackProvider>
          <DataProvider>
            <SanityRealtimeProvider>
              <div id="main-content">{children}</div>
              <ServiceWorkerUpdatePrompt />
              <AuthBackgroundGate>
                <BackgroundFeaturesGate />
                <PWAInstaller />
                <OfflineSync />
                <OfflineWarning />
              </AuthBackgroundGate>
            </SanityRealtimeProvider>
          </DataProvider>
        </ModalStackProvider>

        <ConfirmModalProvider />

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
                  gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: true });
                `}
            </Script>
            {/* Track page views on client-side navigation */}
            <Script id="ga4-nav-track" strategy="afterInteractive">
              {`
                if (typeof window !== 'undefined') {
                  const origPushState = history.pushState;
                  const origReplaceState = history.replaceState;
                  function trackGA4PageView() {
                    if (typeof gtag !== 'undefined') {
                      gtag('event', 'page_view', { page_location: window.location.href, page_title: document.title });
                    }
                  }
                  history.pushState = function() {
                    origPushState.apply(this, arguments);
                    trackGA4PageView();
                  };
                  history.replaceState = function() {
                    origReplaceState.apply(this, arguments);
                    trackGA4PageView();
                  };
                  window.addEventListener('popstate', trackGA4PageView);
                }
              `}
            </Script>
          </>
        ) : null}

        {/* Structured Data: Organization + LocalBusiness */}
        <Script
          id="ld-json-org"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["Organization", "LocalBusiness"],
            name: "Jambh Electrics",
            url: SITE_URL,
            logo: `${SITE_URL}/je-p-512.png`,
            image: `${SITE_URL}/je-p-512.png`,
            telephone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+918607871431",
            email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "jambhelectric@gmail.com",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Vpo Lilas",
              addressLocality: "Siwani",
              addressRegion: "Haryana",
              addressCountry: "IN",
            },
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                opens: "08:00",
                closes: "20:00",
              },
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: "Sunday",
                opens: "09:00",
                closes: "17:00",
              },
            ],
            sameAs: [
              `https://wa.me/${(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "+918607871431").replace(/[^0-9]/g, "")}`,
            ],
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
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          })}
        </Script>

        {/* Structured Data: FAQ */}
        <Script
          id="ld-json-faq"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Do you provide home service?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes, we provide home electrical services based on location and technician availability.",
                },
              },
              {
                "@type": "Question",
                name: "Do you repair appliances?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes, we support common appliance electrical repairs and diagnostics.",
                },
              },
              {
                "@type": "Question",
                name: "Can I rent tools?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Standard rental starts around ₹100/hour and ₹500/day with advance payment.",
                },
              },
              {
                "@type": "Question",
                name: "What are working hours?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Standard hours are 8:00 AM to 8:00 PM.",
                },
              },
            ],
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
