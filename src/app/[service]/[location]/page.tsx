import { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import {
  getServiceBySlug,
  getLocationBySlug,
  generateLocationTitle,
  generateLocationDescription,
  generateLocationKeywords,
  services,
  locations,
  BRAND,
  PHONE,
} from "@/lib/seo-location-config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export async function generateStaticParams() {
  const params: { service: string; location: string }[] = [];
  for (const service of services) {
    for (const location of locations) {
      params.push({ service: service.slug, location: location.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ service: string; location: string }>;
}): Promise<Metadata> {
  const p = await params;
  const service = getServiceBySlug(p.service);
  const location = getLocationBySlug(p.location);

  if (!service || !location) {
    return { title: "Page Not Found" };
  }

  const title = generateLocationTitle(service, location);
  const description = generateLocationDescription(service, location);
  const keywords = generateLocationKeywords(service, location);

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${p.service}/${p.location}`,
      images: [{ url: "/je-p-512.png", width: 512, height: 512, alt: `${service.title} in ${location.name} - ${BRAND}` }],
    },
    twitter: {
      title,
      description,
      images: ["/je-p-512.png"],
    },
    alternates: {
      canonical: `${SITE_URL}/${p.service}/${p.location}`,
    },
  };
}

export default async function LocationServicePage({
  params,
}: {
  params: Promise<{ service: string; location: string }>;
}) {
  const p = await params;
  const service = getServiceBySlug(p.service);
  const location = getLocationBySlug(p.location);

  if (!service || !location) {
    notFound();
  }

  const otherServices = services.filter((s) => s.slug !== service.slug).slice(0, 6);
  const otherLocations = locations.filter((l) => l.slug !== location.slug).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Breadcrumb */}
      <nav className="border-b border-white/[0.04] bg-white/[0.01]" aria-label="Breadcrumb">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <ol className="flex items-center text-xs text-slate-500" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a href="/" className="hover:text-sky-400 transition-colors" itemProp="item">
                <span itemProp="name">Home</span>
              </a>
              <meta itemProp="position" content="1" />
            </li>
            <li className="mx-1.5 text-slate-600">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a href={`/${p.service}`} className="hover:text-sky-400 transition-colors" itemProp="item">
                <span itemProp="name">{service.title}</span>
              </a>
              <meta itemProp="position" content="2" />
            </li>
            <li className="mx-1.5 text-slate-600">/</li>
            <li className="text-sky-400 font-medium" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name">{location.name}</span>
              <meta itemProp="position" content="3" />
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/[0.03] to-transparent" />
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 text-center sm:py-20">
          <h1 className="text-3xl font-bold text-white sm:text-5xl">
            {service.title} in {location.name}
          </h1>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            {service.shortDescription}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Professional {service.title.toLowerCase()} services in {location.name}, Haryana
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/${PHONE.replace(/[^0-9]/g, "")}?text=Hi, I need ${service.title.toLowerCase()} service in ${location.name}`}
              className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Quote on WhatsApp
            </a>
            <a
              href={`tel:${PHONE}`}
              className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* Services Available */}
      <section className="mx-auto max-w-4xl px-4 py-12" aria-label={`Services available in ${location.name}`}>
        <h2 className="text-2xl font-bold text-white mb-6">
          {service.title} Services in {location.name}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
            <h3 className="text-lg font-semibold text-sky-400 mb-2">Residential Services</h3>
            <ul className="space-y-1.5 text-sm text-slate-400">
              <li>House wiring and rewiring</li>
              <li>Home electrical fault repair</li>
              <li>MCB RCCB installation and repair</li>
              <li>LED light and fan installation</li>
              <li>Inverter and battery setup</li>
              <li>Switch board and socket repair</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
            <h3 className="text-lg font-semibold text-sky-400 mb-2">Commercial Services</h3>
            <ul className="space-y-1.5 text-sm text-slate-400">
              <li>Shop and office wiring</li>
              <li>Electrical panel installation</li>
              <li>Load extension and meter work</li>
              <li>Industrial motor and pump repair</li>
              <li>Electrical safety inspection</li>
              <li>Emergency electrician service</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Area Info */}
      <section className="mx-auto max-w-4xl px-4 py-8 border-t border-white/[0.04]" aria-label={`About ${location.name} area`}>
        <h2 className="text-2xl font-bold text-white mb-4">
          About {location.name}
        </h2>
        <p className="text-slate-400 leading-relaxed">
          Jambh Electricals proudly serves {location.name}{location.nearbyLandmarks ? `, ${location.nearbyLandmarks}` : ""} and surrounding areas in Haryana.
          We provide fast, reliable, and affordable electrical services including {service.title.toLowerCase()}, fault repair, wiring, MCB RCCB installation, LED lighting, fan repair, inverter service, and all electrical products.
          {location.priority === "primary" ? " As one of our primary service areas, we ensure quick response times and dedicated support for all your electrical needs in " + location.name + "." :
           location.priority === "secondary" ? " We regularly serve customers in " + location.name + " and have completed numerous electrical projects in the area." :
           " We extend our professional electrical services to " + location.name + " and nearby villages."}
        </p>
      </section>

      {/* Response Time */}
      <section className="mx-auto max-w-4xl px-4 py-8 border-t border-white/[0.04]">
        <h2 className="text-2xl font-bold text-white mb-4">
          Why Choose Jambh Electricals in {location.name}?
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-center">
            <div className="text-2xl font-bold text-sky-400 mb-1">
              {location.priority === "primary" ? "30 Min" : location.priority === "secondary" ? "1 Hour" : "2 Hours"}
            </div>
            <div className="text-sm text-slate-400">Average Response Time</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-center">
            <div className="text-2xl font-bold text-sky-400 mb-1">4.8★</div>
            <div className="text-sm text-slate-400">Customer Rating</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-center">
            <div className="text-2xl font-bold text-sky-400 mb-1">150+</div>
            <div className="text-sm text-slate-400">Projects Completed</div>
          </div>
        </div>
      </section>

      {/* Other Services in this Location */}
      <section className="mx-auto max-w-4xl px-4 py-8 border-t border-white/[0.04]" aria-label="Other services in this area">
        <h2 className="text-xl font-bold text-white mb-4">
          Other Services in {location.name}
        </h2>
        <div className="flex flex-wrap gap-2">
          {otherServices.map((s) => (
            <a
              key={s.slug}
              href={`/${s.slug}/${location.slug}`}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-slate-400 transition-colors hover:border-sky-400/40 hover:text-sky-400"
            >
              {s.title}
            </a>
          ))}
        </div>
      </section>

      {/* Other Locations for this Service */}
      <section className="mx-auto max-w-4xl px-4 py-8 border-t border-white/[0.04]" aria-label="Other areas we serve">
        <h2 className="text-xl font-bold text-white mb-4">
          {service.title} in Nearby Areas
        </h2>
        <div className="flex flex-wrap gap-2">
          {otherLocations.map((l) => (
            <a
              key={l.slug}
              href={`/${p.service}/${l.slug}`}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-slate-400 transition-colors hover:border-sky-400/40 hover:text-sky-400"
            >
              {service.title} in {l.name}
            </a>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mx-auto max-w-4xl px-4 py-12 border-t border-white/[0.04]">
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Need {service.title.toLowerCase()} in {location.name}?
          </h2>
          <p className="text-slate-400 mb-6">
            Contact Jambh Electricals for fast, reliable, and affordable {service.title.toLowerCase()} services in {location.name} and nearby areas.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/${PHONE.replace(/[^0-9]/g, "")}?text=Hi, I need ${service.title.toLowerCase()} service in ${location.name}`}
              className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp Us
            </a>
            <a
              href={`tel:${PHONE}`}
              className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* Structured Data */}
      <Script
        id={`ld-json-${p.service}-${p.location}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${service.title} in ${location.name}`,
            description: `Jambh Electricals provides professional ${service.title.toLowerCase()} services in ${location.name}, Haryana. ${service.shortDescription}.`,
            url: `${SITE_URL}/${p.service}/${p.location}`,
            provider: {
              "@type": "ElectricalContractor",
              name: BRAND,
              url: SITE_URL,
              telephone: PHONE,
              address: {
                "@type": "PostalAddress",
                streetAddress: "Lilas",
                addressLocality: "Lilas",
                addressRegion: "Haryana",
                addressCountry: "IN",
              },
            },
            areaServed: {
              "@type": "Place",
              name: location.name,
            },
            serviceType: service.title,
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
            },
          }),
        }}
      />
    </div>
  );
}
