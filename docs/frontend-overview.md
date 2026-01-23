# Frontend Overview (Next.js App Router)

This document explains the frontend stack, structure, common patterns, and how to create new pages like a marketing homepage, About, and more.

## Stack

- **Framework**: Next.js 15 (App Router) — `src/app/`
- **Language**: TypeScript, React 19
- **Styling**: Tailwind CSS — config in `tailwind.config.ts`, globals in `src/app/globals.css`
- **Auth**: Clerk — `@clerk/nextjs` provider in `src/app/layout.tsx`
- **State**: Zustand — e.g. `useAuthStore` in `src/store/`
- **UI/UX**: Radix UI primitives, `lucide-react` icons, `sonner` toasts, custom components in `src/components/`
- **Forms**: `react-hook-form` + `zod` resolvers
- **Images**: Next Image with domains configured in `next.config.ts`
- **PWA/Notifications**: Firebase Cloud Messaging, SW bridges, offline overlays in `src/components/`
- **CMS**: Sanity client utilities present; content images allowed via `cdn.sanity.io`
- **Utilities**: Axios for HTTP, `date-fns`, `clsx`, `tailwind-merge`

## Key Configs

- **Next config**: `next.config.ts`
  - `images.remotePatterns` allow `localhost:3333` and `cdn.sanity.io`
  - `@` alias -> `src` (`config.resolve.alias['@'] = path.resolve(__dirname, 'src')`)
  - Production strips `console.*`
- **Tailwind**: `tailwind.config.ts`
  - `darkMode: ['class']` (dark is applied by `html.dark` in `layout.tsx`)
  - Design tokens mapped to CSS variables declared in `globals.css`
- **TypeScript**: `tsconfig.json` (standard Next.js TS settings)

## App Layout and Global Providers

- Root layout: `src/app/layout.tsx`
  - Wraps the app with `ClerkProvider` and a custom `DataProvider`
  - Registers global utilities: route progress, offline status, notifications bridges, toasters
  - Adds GA4 and structured data if env vars provided
  - Imports `src/app/globals.css`
- ISR: `export const revalidate = 60` at layout level (per-route can override)

## Routing Model (App Router)

- Pages are directories under `src/app/` containing a `page.tsx` file
- Route groups `(group-name)` are folders that don’t affect the URL
- Nested layouts via `layout.tsx` inside folders
- Special files: `loading.tsx`, `not-found.tsx`, `error.tsx` per route
- Existing notable routes:
  - `src/app/page.tsx` — root path `/` currently only redirects (client side)
  - `src/app/login/page.tsx` — login
  - `src/app/admin/...` — admin area (e.g., `admin/dashboard`)
  - `src/app/customer/...` — customer area (e.g., `customer/bills`)

## Current Root Redirect

- `src/app/page.tsx` renders `ClientRedirect` which does:
  - If authenticated:
    - `role === 'admin'` => `/admin/dashboard`
    - otherwise => `/customer/bills`
  - If unauthenticated => `/login`
  - Source: `src/components/home/client-redirect.tsx`

If you want a public marketing homepage at `/`, you’ll need to change this behavior (see recipes below).

## Styling System

- Tokens defined in `src/app/globals.css` using CSS variables
- Tailwind classes and layers used widely
- Dark mode enabled via `html.dark`
- Custom scrollbar styling and inputs adjustments in `globals.css`

## UI Components

- Located in `src/components/`
- Includes shared UI like `ui/route-progress`, `ui/confirmation-modal.tsx`, notifications, PWA helpers, etc.
- Prefer using existing primitives and patterns for consistency

## State and Auth

- Zustand store(s) under `src/store/`, e.g., `useAuthStore`
- Clerk handles session/auth on server and client; `ClerkProvider` in `layout.tsx`
- For protected routes, use server-side auth checks or client redirects depending on need

## SEO and Metadata

- Global defaults in `src/app/layout.tsx` via the `metadata` export
- OpenGraph, Twitter cards, icons, manifest defined
- Use per-page `export const metadata` to override the title/description

## Images

- Allowed remote domains are configured in `next.config.ts`
- Use `<Image />` for optimization and domain safety

## Environment Variables

- Public vars used: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `GOOGLE_SITE_VERIFICATION`
- Example environment template: `docs/env.example`

## Performance

- Default ISR (`revalidate = 60`); adjust per-route
- Route progress via `nprogress` styled in CSS
- Console removed in production via Next compiler option

---

# Recipes: Create New Pages

Below are common ways to add marketing/public pages (Homepage, About, etc.). Choose the approach that fits your desired URL behavior.

## Option A: Make `/` a Public Marketing Homepage

Use a public homepage at `/`, and move app-redirect logic to a dedicated path (e.g., `/app`).

1. Create `src/app/(public)/page.tsx` and move your marketing UI there.
2. Replace `src/app/page.tsx` to render your marketing home instead of redirecting.
3. Create `/app` route to keep the old redirect behavior when users go to the application section.

Example structure:

```
src/app/
  (public)/
    page.tsx           // marketing homepage content
    about/
      page.tsx         // about page content
  app/
    page.tsx           // redirects to admin/customer based on role
  login/
    page.tsx
  admin/
    dashboard/
      page.tsx
  customer/
    bills/
      page.tsx
```

Example `src/app/app/page.tsx` (redirect hub):

```tsx
import ClientRedirect from "@/components/home/client-redirect";
export default function AppHub() {
  return <ClientRedirect />;
}
```

Then update the root `src/app/page.tsx` to be your marketing homepage (see sample below).

## Option B: Keep `/` Redirecting, Put Marketing at `/home` and `/about`

- Leave `src/app/page.tsx` as is (redirect)
- Add marketing pages at `src/app/home/page.tsx` and `src/app/about/page.tsx`
- Link to these from places you need (e.g., landing links, external)

This is faster if you don’t want to change the root behavior now.

## Sample Marketing Pages

Homepage at `src/app/(public)/page.tsx`:

```tsx
export const metadata = {
  title: "Welcome to Jambh Electrics",
  description: "Billing, inventory, and customer management.",
};

export default function MarketingHome() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-semibold">Jambh Electrics</h1>
      <p className="text-muted-foreground max-w-prose text-center">
        Smart billing and inventory for shops and customers.
      </p>
      <div className="flex gap-3">
        <a
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
          href="/login"
        >
          Log in
        </a>
        <a className="px-4 py-2 rounded-md border" href="/about">
          About
        </a>
      </div>
    </main>
  );
}
```

About page at `src/app/(public)/about/page.tsx`:

```tsx
export const metadata = {
  title: "About | Jambh Electrics",
  description: "Learn about Jambh Electrics and our mission.",
};

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-semibold">About Jambh Electrics</h1>
      <p>
        We build practical billing tools for electricians and retail shops,
        focusing on performance, offline-safe UX, and realtime notifications.
      </p>
    </main>
  );
}
```

## Adding More Pages

- Create a folder with a `page.tsx` under `src/app/...`
- For nested URLs, nest folders (e.g., `src/app/products/page.tsx` for `/products`)
- Add `export const metadata` for SEO
- Use a local `layout.tsx` in a folder if the section needs its own shell/navigation
- If page needs client interactivity, add `'use client'` at the top

## Protected Pages

- Server-side: perform auth checks in the page or layout and redirect unauthenticated users using `redirect()` from `next/navigation`
- Client-side: use a component like `ClientRedirect` or your own guard that reads Zustand/Clerk and navigates

## Common Imports and Aliases

- Use `@` to import from `src`, e.g. `import Button from '@/components/ui/button'`
- Prefer existing components in `src/components/` for consistent UX

## Forms and Validation

- Use `react-hook-form` + `zod` resolvers
- Show validation errors inline
- Use `sonner` for toast notifications on submit success/failure

## Loading, Error, Not Found

- Add `loading.tsx`, `error.tsx`, `not-found.tsx` in a route folder to customize
- Global `not-found.tsx` is already present at `src/app/not-found.tsx`

## Sitemaps and Robots

- Files live at root of app: `src/app/sitemap.ts`, `src/app/robots.ts`
- When adding public routes, you may want to include them in the sitemap

## PWA and Notifications

- Service worker registration is in `layout.tsx`
- Public files: `public/firebase-messaging-sw.js` and icons
- Bridges: `src/components/notifications/` and `src/components/pwa/`

## Deployment Notes

- Ensure env vars are set for production (`NEXT_PUBLIC_SITE_URL`, GA, etc.)
- `compiler.removeConsole` strips console in production; use proper logging/instrumentation where necessary

---

# Quick Checklist to Add a New Public Page

- Create folder + `page.tsx` under `src/app/(public)/...`
- Add `export const metadata` for SEO
- Use Tailwind classes for layout and design consistency
- Link it from your homepage or header
- If promoting it in sitemap, update `src/app/sitemap.ts`

# Next Steps

If you’d like, I can:

- Convert `/` into a marketing homepage and move the app redirect to `/app`
- Scaffold `About`, `Contact`, and other pages with consistent layout
- Add a small public layout shell with a header/footer for marketing pages
