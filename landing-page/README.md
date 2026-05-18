# Landing Page Module

This folder contains a standalone landing/login surface separated from the main app UI.

- `components/home/*` is a cloned copy of landing/home components.
- `components/forms/login-form.tsx` is a cloned login form.
- `components/LandingLoginPage.tsx` handles login via existing backend auth flow and redirects into the main app after success.

Routes wired in the main Next.js app:
- `/` uses `@landing/components/home/HomeLanding`
- `/login` uses `@landing/components/LandingLoginPage`

After authentication, users are redirected to the existing app routes (`/admin/dashboard` or `/customer/bills`).
