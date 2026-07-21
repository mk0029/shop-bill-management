import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login", "/request-account", "/test-deploy", "/sanity-realtime-demo"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "Bytespider",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "CCBot",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/admin/", "/customer/", "/api/", "/dashboard/", "/settings/", "/login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
