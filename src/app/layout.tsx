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
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";
const BRAND = "Jambh Electricals";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const BING_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;
const PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+918607871431";
const EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "jambhelectric@gmail.com";
const WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "+918607871431";
const WHATSAPP_NUM = WHATSAPP.replace(/[^0-9]/g, "");

const PRIMARY_AREAS = "Lilas, Sainiwas, Siwani";
const ALL_AREAS = "Lilas, Sainiwas, Siwani, Hisar, Tosham, Bhiwani, Hansi, Barwala, Agroha, Adampur & Nearby Villages";

const verification: Record<string, string> = {};
if (GOOGLE_SITE_VERIFICATION) verification.google = GOOGLE_SITE_VERIFICATION;
if (BING_SITE_VERIFICATION) verification.msvalidate = BING_SITE_VERIFICATION;
const verificationObj = Object.keys(verification).length > 0
  ? { ...verification, yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined }
  : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND} - Trusted Electrical Shop & Electrician Serving ${PRIMARY_AREAS}, Hisar & Nearby Areas`,
    template: `%s | ${BRAND}`,
  },
  description: `${BRAND} is a trusted electrical shop and electrician service based in Lilas, Haryana. We serve Lilas, Sainiwas, Siwani, Hisar and nearby areas. Professional electrician services — house wiring, MCB RCCB repair, LED light installation, fan repair, inverter repair, motor repair, electrical fault finding, and all electrical products. Call ${PHONE}.`,
  applicationName: BRAND,
  keywords: [
    "Jambh Electricals",
    "Jambh Electricals Lilas",
    "Jambh Electricals Sainiwas",
    "Jambh Electricals Siwani",
    "Jambh Electricals Hisar",
    "Jambh Electricals Haryana",
    "Jambh Electric Shop",
    "Jambh Electrical Store",
    "electrician Lilas",
    "electrician Sainiwas",
    "electrician Siwani",
    "electrician Hisar",
    "electrician near me",
    "best electrician Lilas",
    "local electrician Siwani",
    "electrical shop Lilas",
    "electrical shop Siwani",
    "electrical shop Hisar",
    "electrical store Lilas",
    "house wiring",
    "home wiring",
    "electrical wiring",
    "MCB repair",
    "RCCB repair",
    "fault repair",
    "electrical fault",
    "short circuit repair",
    "LED light installation",
    "fan repair",
    "inverter repair",
    "motor repair",
    "switch repair",
    "electrical services",
    "electrical contractor",
    "electrical maintenance",
    "bijli wala",
    "bijli mistri",
    "ghar wiring",
    "emergency electrician",
    "electrical items",
    "electrical products",
    "electrical material",
    "wires and cables",
    "modular switches",
    "distribution board",
    "DB box",
    "electrical repair",
    "electrical installation",
    "electrical troubleshooting",
  ],
  authors: [{ name: BRAND }],
  creator: BRAND,
  publisher: BRAND,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
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
    title: `${BRAND} - Trusted Electrical Shop & Electrician Serving ${PRIMARY_AREAS}`,
    description: `Professional electrical shop and electrician based in Lilas, Haryana. Serving Lilas, Sainiwas, Siwani, Hisar & nearby areas. House wiring, MCB RCCB, LED lights, fan repair, inverter, motor repair.`,
    url: SITE_URL,
    siteName: BRAND,
    images: [
      {
        url: "/je-p-512.png",
        width: 512,
        height: 512,
        alt: `${BRAND} - Electrical Shop and Electrician Services in Lilas Sainiwas Siwani Hisar Haryana`,
        type: "image/png",
      },
    ],
    type: "website",
    locale: "en_IN",
    alternateLocale: ["hi_IN"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND} - Electrical Shop & Electrician Serving ${PRIMARY_AREAS}`,
    description: `Trusted electrical shop in Lilas, Haryana. Serving Lilas, Sainiwas, Siwani, Hisar & nearby areas. Electrician services, house wiring, MCB RCCB, LED, fan, inverter, motor repair. Call ${PHONE}.`,
    images: ["/je-p-512.png"],
    creator: "@jambhelectricals",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND,
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

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["ElectricalContractor", "ServiceAreaBusiness"],
  name: BRAND,
  alternateName: ["Jambh Electricals Lilas", "Jambh Electricals Siwani", "Jambh Electric Shop", "Jambh Electrical Store"],
  description: `${BRAND} is a trusted electrical shop and electrician service based in Lilas, Haryana. We serve Lilas, Sainiwas, Siwani, Hisar, Tosham, Bhiwani, Hansi, Barwala, Agroha, Adampur and nearby villages. Services include house wiring, fault repair, MCB RCCB installation, LED lighting, fan repair, inverter service, motor repair, and all electrical products.`,
  url: SITE_URL,
  logo: `${SITE_URL}/je-p-512.png`,
  image: `${SITE_URL}/je-p-512.png`,
  telephone: PHONE,
  email: EMAIL,
  priceRange: "₹₹",
  currency: "INR",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Lilas",
    addressLocality: "Lilas",
    addressRegion: "Haryana",
    postalCode: "125078",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 29.1631,
    longitude: 75.3966,
  },
  areaServed: [
    { "@type": "Place", name: "Lilas" },
    { "@type": "Place", name: "Sainiwas" },
    { "@type": "Place", name: "Siwani" },
    { "@type": "City", name: "Hisar" },
    { "@type": "Place", name: "Tosham" },
    { "@type": "City", name: "Bhiwani" },
    { "@type": "City", name: "Hansi" },
    { "@type": "Place", name: "Barwala" },
    { "@type": "Place", name: "Agroha" },
    { "@type": "Place", name: "Adampur" },
    { "@type": "State", name: "Haryana" },
  ],
  serviceType: [
    "Electrician Services",
    "House Wiring",
    "Electrical Fault Repair",
    "MCB RCCB Installation",
    "LED Light Installation",
    "Fan Repair Service",
    "Inverter Repair",
    "Motor Repair",
    "Electrical Maintenance",
    "Emergency Electrician",
    "Commercial Electrical Work",
    "Industrial Electrical Services",
    "Electrical Inspection",
    "Switch and Socket Repair",
    "Distribution Board Installation",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Electrical Products and Services",
    itemListElement: [
      {
        "@type": "OfferCatalog",
        name: "Electrical Services",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "House Wiring and Rewiring" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Electrical Fault Finding and Repair" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "MCB RCCB Installation and Repair" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "LED Light Installation and Repair" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Ceiling Fan Repair and Installation" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Inverter and UPS Repair" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Water Motor and Pump Repair" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Emergency Electrician Service" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Electrical Safety Inspection" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Switch Board and Socket Repair" } },
        ],
      },
      {
        "@type": "OfferCatalog",
        name: "Electrical Products",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Product", name: "Electrical Wires and Cables" } },
          { "@type": "Offer", itemOffered: { "@type": "Product", name: "Modular Switches and Sockets" } },
          { "@type": "Offer", itemOffered: { "@type": "Product", name: "MCB and RCCB" } },
          { "@type": "Offer", itemOffered: { "@type": "Product", name: "Distribution Board and DB Box" } },
          { "@type": "Offer", itemOffered: { "@type": "Product", name: "LED Bulbs and Tube Lights" } },
          { "@type": "Offer", itemOffered: { "@type": "Product", name: "Ceiling Fans and Exhaust Fans" } },
          { "@type": "Offer", itemOffered: { "@type": "Product", name: "Inverters and Batteries" } },
          { "@type": "Offer", itemOffered: { "@type": "Product", name: "Electrical Tape and Accessories" } },
        ],
      },
    ],
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
    `https://wa.me/${WHATSAPP_NUM}`,
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    bestRating: "5",
    ratingCount: "150",
  },
  potentialAction: {
    "@type": "ReserveAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `https://wa.me/${WHATSAPP_NUM}?text=Hi, I need electrician service`,
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND,
  alternateName: ["Jambh Electricals Lilas", "Jambh Electric Shop"],
  url: SITE_URL,
  logo: `${SITE_URL}/je-p-512.png`,
  image: `${SITE_URL}/je-p-512.png`,
  description: `${BRAND} is the leading electrical shop and electrician service based in Lilas, Haryana. We serve Lilas, Sainiwas, Siwani, Hisar and nearby areas with house wiring, fault repair, MCB RCCB, lighting, fan, inverter, motor services and all electrical products.`,
  telephone: PHONE,
  email: EMAIL,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Lilas",
    addressLocality: "Lilas",
    addressRegion: "Haryana",
    postalCode: "125078",
    addressCountry: "IN",
  },
  sameAs: [
    `https://wa.me/${WHATSAPP_NUM}`,
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: PHONE,
    contactType: "customer service",
    areaServed: ["IN"],
    availableLanguage: ["English", "Hindi"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: BRAND,
  url: SITE_URL,
  description: `${BRAND} - Trusted electrical shop and electrician serving Lilas, Sainiwas, Siwani, Hisar & nearby areas. House wiring, MCB RCCB repair, LED lights, fan repair, inverter, motor repair, and all electrical products.`,
  publisher: {
    "@type": "Organization",
    name: BRAND,
    logo: `${SITE_URL}/je-p-512.png`,
  },
  inLanguage: ["en-IN", "hi-IN"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/shop-items?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do you provide home electrical services in Lilas, Sainiwas, Siwani and nearby areas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Jambh Electricals provides complete home electrical services in Lilas, Sainiwas, Siwani, Hisar and surrounding areas including house wiring, rewiring, fault repair, MCB RCCB installation, light fitting, fan repair, and emergency electrician services. Call us at +918607871431.",
      },
    },
    {
      "@type": "Question",
      name: "Where is Jambh Electricals located?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Jambh Electricals is based in Lilas, Haryana - 125078, India. We serve Lilas, Sainiwas, Siwani, Hisar, Tosham, Bhiwani, Hansi, Barwala, Agroha, Adampur and nearby villages.",
      },
    },
    {
      "@type": "Question",
      name: "Do you repair electrical faults and short circuits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, we handle all types of electrical fault repair including short circuit repair, power trip repair, MCB tripping, RCCB tripping, current leakage, earth leakage, phase problems, neutral faults, and electrical breakdown diagnostics.",
      },
    },
    {
      "@type": "Question",
      name: "Can I rent electrical tools from Jambh Electricals?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Jambh Electricals offers tool rental services. Standard rental starts around ₹100 per hour and ₹500 per day with advance payment. Contact us for available tools and booking.",
      },
    },
    {
      "@type": "Question",
      name: "What are the working hours of Jambh Electricals?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Jambh Electricals is open Monday to Saturday from 8:00 AM to 8:00 PM and Sunday from 9:00 AM to 5:00 PM. For emergency electrician services, call us anytime.",
      },
    },
    {
      "@type": "Question",
      name: "What electrical products do you sell?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Jambh Electricals is a complete electrical store selling wires and cables (FR wire, FRLS wire), modular switches and sockets, MCB RCCB, distribution boards, LED bulbs and tube lights, ceiling fans, exhaust fans, inverters, batteries, electrical tape, conduit pipes, junction boxes, extension boards, and all electrical accessories.",
      },
    },
    {
      "@type": "Question",
      name: "Do you provide commercial and industrial electrical services?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Jambh Electricals provides commercial electrical services for shops, offices, and factories as well as industrial electrical services including motor rewinding, pump repair, heavy wiring, electrical panel installation, and load extension.",
      },
    },
    {
      "@type": "Question",
      name: "How much does house wiring cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "House wiring cost depends on the size of the house, type of wiring (concealed or surface), and materials used. Contact Jambh Electricals at +918607871431 for a free estimate for your house wiring project.",
      },
    },
    {
      "@type": "Question",
      name: "Do you install and repair MCB and RCCB?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Jambh Electricals provides complete MCB repair, MCB replacement, MCB installation, RCCB installation, RCCB repair, ELCB, isolator, changeover, and distribution board services. We handle all types of circuit breaker and electrical panel work.",
      },
    },
  ],
};

const speakableSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: BRAND,
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".speakable"],
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
              <div id="main-content" role="main">{children}</div>
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

        {/* Structured Data: LocalBusiness (ServiceAreaBusiness) */}
        <Script
          id="ld-json-local-business"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />

        {/* Structured Data: Organization */}
        <Script
          id="ld-json-org"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />

        {/* Structured Data: WebSite with SearchAction */}
        <Script
          id="ld-json-website"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        {/* Structured Data: FAQ (voice search optimized) */}
        <Script
          id="ld-json-faq"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />

        {/* Structured Data: Speakable for voice assistants */}
        <Script
          id="ld-json-speakable"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
        />
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
