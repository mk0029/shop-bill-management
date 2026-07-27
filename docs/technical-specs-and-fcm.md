# Project Technical Specifications and Firebase Cloud Messaging (FCM)

This document outlines the technology stack, architecture, and detailed Firebase Cloud Messaging (FCM) implementation used in this project.

## 1) Technical Specifications

### Programming Languages

- TypeScript (primary) — app code and API routes
- JavaScript — service workers under `public/`
- CSS — Tailwind CSS utility classes

### Frameworks and Libraries

- Next.js 15.4.5 — App Router and API routes (`next.config.ts`, `src/app/api/`)
- React 19.1.0 — UI components
- Tailwind CSS 3.4.x — styling (`tailwind.config.ts`)
- Zustand 5.x — state management (`src/store/auth-store.ts`)
- Clerk — authentication (`@clerk/nextjs`, e.g., `src/components/providers/auth-prehydrate.tsx`)
- Sanity CMS — headless CMS and data store (`@sanity/client`, `sanity-schemas/`)
- Firebase SDK (client) — FCM web client capabilities (`firebase`)
- Firebase Admin SDK — server-side FCM sending (`firebase-admin`)
- Radix UI primitives, `lucide-react`, `react-hook-form`, `date-fns`, `zod`, `sonner`, `nprogress`, `framer-motion`, `clsx`, `class-variance-authority`

### Database / Data Layer

- Sanity CMS is the primary data layer. User push tokens are stored in user documents (field `fcmTokens`).

### Backend

- Node.js via Next.js Route Handlers (App Router) under `src/app/api/`
- Firebase Admin for push sends (`src/lib/firebase-admin.ts`, `src/lib/notification-service.ts`)
- Notable endpoints:
  - `POST /api/notifications/register-token` — register an FCM token for a user (`src/app/api/notifications/register-token/route.ts`)
  - `POST /api/notifications/send` — send notifications to admins, tokens, or userIds (`src/app/api/notifications/send/route.ts`)

### Frontend

- Next.js + React + TypeScript
- Tailwind CSS for styling
- Zustand for client-side state
- Clerk for authentication UI and session

### Hosting/Deployment

- Vercel (see `vercel.json` and `next.config.ts`)
- Build: `npm run build`
- Dev: `npm run dev`

### APIs

- Firebase Cloud Messaging (Web)
- Sanity Content API

### Authentication

- Clerk (`@clerk/nextjs`)

### Operating Systems

- Development: Windows supported (local `.next-build` to avoid file locks — see `next.config.ts`)
- Deployment: Vercel Linux environment

### Version Control

- Git (see `.gitignore`). Remote provider not pinned in repo files.

### Other Tools/Services

- PostCSS & Autoprefixer
- ESLint (`eslint.config.mjs`, `eslint-config-next`)
- Turbopack for dev (`npm run dev`)
- NPM for package management

---

## 2) Firebase Cloud Messaging (FCM)

### Overview

FCM is implemented to send web push notifications. Offline caching and FCM background handling are unified in a single service worker at `public/sw.js`. A backward-compatible shim `public/firebase-messaging-sw.js` imports that file for projects registering the default name.

### Setup Process (Web)

1. Service worker and Firebase compat scripts
   - `public/sw.js` includes:
     - `importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')`
     - `importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js')`
   - Initializes Firebase app with the project config (see `public/sw.js`).
   - Handles offline caching and push events.
2. Backend (Admin SDK)
   - `src/lib/firebase-admin.ts` initializes Admin using environment variables:
     - `FIREBASE_SERVICE_ACCOUNT_JSON` (full JSON or base64)
     - OR `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (with `\n` newlines handled)
3. Token registration
   - Clients obtain an FCM token and call `POST /api/notifications/register-token` with `{ token, userId }`.
   - The route stores the token on the corresponding Sanity `user` document’s `fcmTokens` array.
   - Uses optimistic concurrency via Sanity `_rev` and `.ifRevisionId(...)` to prevent conflicts.
4. Compatibility worker
   - `public/firebase-messaging-sw.js`:
     - Delegates to `importScripts('/sw.js')` to keep backward compatibility.

### Message Types

- Notification messages: include `{ notification: { title, body } }` (default in server send flow).
- Data messages: sent without `notification`, handled in `push` event (`public/sw.js`) to avoid double notifications.

### Use Cases

- Admin broadcast: send to all admins’ tokens via `sendToAdmins()`.
- Targeted notifications: send to explicit tokens or resolve tokens by user IDs stored in Sanity.
- Real-time operational alerts and engagement aligned to inventory/billing workflows.

### Implementation Details

- Backend send (`src/lib/notification-service.ts`):
  - Resolves target tokens from provided `tokens` or from `userIds` via Sanity query.
  - Deduplicates tokens and coerces `data` values to strings (FCM requirement).
  - Uses `admin.messaging().sendEachForMulticast(...)` with platform hints (Android/APNS sound).
- Client SW (`public/sw.js`):
  - `messaging.onBackgroundMessage(...)` displays notifications when the app is in background/closed.
  - `self.addEventListener('push', ...)` handles raw Web Push or data-only payloads and avoids double notifications if `notification` is present.
  - `notificationclick` focuses an existing tab or opens a new window and navigates to `data.link`.

### Client-Side Setup

- File: `src/lib/fcm-client.ts`
  - Initializes Firebase compat and `messaging` client with the same config as `public/sw.js`.
  - `requestNotificationPermissionAndGetToken(userId)`: asks for browser permission and retrieves a token using `FIREBASE_VAPID_KEY`, then POSTs to `/api/notifications/register-token` with `{ token, userId }`.
  - `listenForegroundMessages()`: uses `messaging.onMessage` to show a foreground `Notification` when the app is active (alternative: in-app toast).
  - `listenTokenRefresh(userIdProvider)`: re-fetches and re-registers tokens on refresh-capable environments and on visibility changes (hourly throttle).
  - `initFCM(userIdProvider)`: convenience initializer to set up listeners after auth is ready.

Example usage (React):

```tsx
import { useEffect } from "react";
import {
  initFCM,
  requestNotificationPermissionAndGetToken,
} from "@/lib/fcm-client";
import { useAuth } from "@clerk/nextjs";

export function FCMInitializer() {
  const { userId } = useAuth();
  useEffect(() => {
    initFCM(() => userId || null);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    requestNotificationPermissionAndGetToken(userId);
  }, [userId]);

  return null;
}
```

### Notification Enhancements (Service Worker)

- IndexedDB offline queue for notifications received while offline; replayed on reconnection or activation.
- Rich notifications with `image`, `badge`, custom `icon`, vibration and action buttons (`view-bill`, `dismiss`).
- Preference check via `/api/notifications/preferences` before showing a notification; safe same-origin navigation.
- Retry logic up to 3 times for transient show failures.

### Security Measures

- Admin credentials are sourced only from environment variables; no secrets in client code.
- Token registration endpoint validates input and uses revision checks to avoid concurrent writes.
- No sensitive data logged; errors are handled gracefully.

### Challenges and Solutions

- Concurrent token updates — solved with optimistic concurrency (`.ifRevisionId(...)`) and a single retry on 409 conflict.
- Double notifications — prevented by skipping SW `push` display if a `notification` block exists in the FCM payload.
- Windows local file lock in dev — mitigated by `.next-build` local distDir (`next.config.ts`).

### API Contracts and Examples

#### Register token

- Endpoint: `POST /api/notifications/register-token`
- Body:

```json
{
  "token": "<fcm-token>",
  "userId": "<sanity-_id-or-clerkId-or-customerId>"
}
```

- Response: `{ success: boolean, data?: { _id: string, tokens?: string[], alreadyRegistered?: boolean }, error?: string }`
- cURL:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN","userId":"USER_ID"}' \
  https://<your-domain>/api/notifications/register-token
```

#### Send notification (admins)

- Endpoint: `POST /api/notifications/send`
- Body:

```json
{
  "audience": "admins",
  "title": "System Update",
  "body": "A new bill has been generated.",
  "data": { "link": "/admin/billing" }
}
```

- cURL:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"audience":"admins","title":"System Update","body":"A new bill has been generated.","data":{"link":"/admin/billing"}}' \
  https://<your-domain>/api/notifications/send
```

#### Send notification (target users)

- Endpoint: `POST /api/notifications/send`
- Body (by userIds):

```json
{
  "userIds": ["user-1", "user-2"],
  "title": "Bill Ready",
  "body": "Your bill #123 is ready.",
  "data": { "link": "/bills/123" }
}
```

- Body (by tokens):

```json
{
  "tokens": ["token-1", "token-2"],
  "title": "Promo",
  "body": "New discount available.",
  "data": { "link": "/offers" }
}
```

- cURL (userIds):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"userIds":["user-1","user-2"],"title":"Bill Ready","body":"Your bill #123 is ready.","data":{"link":"/bills/123"}}' \
  https://<your-domain>/api/notifications/send
```

### Environment Variables

- Firebase Admin (choose one approach):
  - `FIREBASE_SERVICE_ACCOUNT_JSON` — complete JSON or base64-encoded JSON
  - OR all of:
    - `FIREBASE_PROJECT_ID`
    - `FIREBASE_CLIENT_EMAIL`
    - `FIREBASE_PRIVATE_KEY` (supports `\n` newlines)
- Sanity client variables (as configured in `src/lib/sanity`)

### File Map and References

- `public/sw.js` — offline caching + FCM background handlers
- `public/firebase-messaging-sw.js` — shim that imports `/sw.js`
- `src/app/api/notifications/register-token/route.ts` — token registration with concurrency control
- `src/app/api/notifications/send/route.ts` — send endpoint (admins or tokens/userIds)
- `src/lib/notification-service.ts` — token resolution and multicast send logic
- `src/lib/firebase-admin.ts` — Admin SDK initialization via env
- `package.json` — dependency versions
- `next.config.ts`, `vercel.json` — deployment/runtime configuration

---

## 3) Achievements

### Project Milestones

- Production-ready modular architecture with real-time features
- Unified service worker for offline and FCM handling
- Admin and user-targeted notifications fully implemented

### Performance Metrics

- Delivery results available from `sendEachForMulticast` response (success/failure counts)
- Recommend instrumenting CTR and opt-in rates (not tracked in-repo)

### FCM-Specific Achievements

- Robust token registration with deduplication and conflict retries
- Admin audience broadcasting
- Background handling with click-to-focus/open UX
- Reliable background and offline notifications (IndexedDB queue + unified display)

### Awards or Recognition

- No awards received to date

### User Feedback

- Not captured in-repo; recommended to add analytics for notification engagement

### Scalability

- Horizontal scaling on Vercel
- Deduplicated multicast sending
- Token resolution via Sanity with filters for inactive users; can be optimized as user base grows

---

## 4) Quick Checklist

- [ ] Set Firebase Admin environment variables in deployment
- [ ] Ensure service worker registration points to `/sw.js` (shim present for compatibility)
- [ ] Add `src/lib/fcm-client.ts` and initialize in the app shell after auth is ready
- [ ] Request notification permission in the app and obtain FCM token (with `FIREBASE_VAPID_KEY`)
- [ ] Call `/api/notifications/register-token` with `{ token, userId }`
- [ ] Use `/api/notifications/send` for admins or targeted users as needed
- [ ] Verify service worker queuing and foreground notifications work across Chrome/Firefox (note Safari limitations)
