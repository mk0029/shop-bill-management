import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/admin`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/admin/billing`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/admin/billing/pending`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    // { url: `${SITE_URL}/admin/billing/history`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/customer`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/customer/bills`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];

  return urls;
}
