import type { MetadataRoute } from "next";
import { services, locations } from "@/lib/seo-location-config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

const servicePages = [
  { slug: "electrical-product-sales", priority: 0.8 },
  { slug: "home-electrical-services", priority: 0.9 },
  { slug: "new-wiring-fitting", priority: 0.9 },
  { slug: "appliance-repair", priority: 0.8 },
  { slug: "fault-detection", priority: 0.8 },
  { slug: "tool-rental", priority: 0.7 },
  { slug: "maintenance-support", priority: 0.8 },
  { slug: "emergency-support", priority: 0.9 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/shop-items`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/rent-tools`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/refund-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/help-payment-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const servicePageUrls: MetadataRoute.Sitemap = servicePages.map((service) => ({
    url: `${SITE_URL}/services/${service.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: service.priority,
  }));

  const loginUrls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/request-account`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const locationPageUrls: MetadataRoute.Sitemap = [];
  for (const service of services) {
    for (const location of locations) {
      const priorityValue = location.priority === "primary" ? 0.9 : location.priority === "secondary" ? 0.7 : 0.6;
      locationPageUrls.push({
        url: `${SITE_URL}/${service.slug}/${location.slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: priorityValue,
      });
    }
  }

  return [...staticUrls, ...servicePageUrls, ...loginUrls, ...locationPageUrls];
}
