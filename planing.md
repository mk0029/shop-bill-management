# ⚡ Electrician Shop Web + LLM IDE Plan

## 💻 Tech Stack

- **Framework**: React + Next.js (with TypeScript)
- **Styling/UI**: TailwindCSS (Dark Mode UI), shadcn/ui
- **Icons**: Lucide
- **Animation**: Framer Motion
- **Backend CMS**: Sanity.io
- **Real-time**: Socket.IO
- **Auth**: Clerk (admin creates users, customers login only)
- **State Management**: Zustand (roles + localization)

---

## 🔐 Auth System

- Admin creates all user accounts from dashboard
- Clerk stores the user (ID + secret key shared with customer)
- Customer can only **login** (no signup flow)
- After login:

  - Customer can update username/password
  - Role is detected and handled in Zustand

---

## 🌍 Pages & Routes (Auto-generated UI by IDE)

### Public Pages

- `/login` → Customer login with ID/key

### Admin Pages

- `/admin/dashboard` → Total summary + actions
- `/admin/customers` → Customer list, create, edit, delete
- `/admin/customers/[id]` → View specific customer
- `/admin/billing` → Create bills manually
- `/admin/sales-report` → Calculate sales/loss/profit
- `/admin/settings` → Profile, password update, roles

### Customer Pages

- `/customer/home` → Welcome + recent bills
- `/customer/book` → View personal billing book
- `/customer/profile` → View & edit username/password

---

## 🧱 Component Structure

### UI Components

- `Button`, `Card`, `Badge`, `Label`, `Input`, `Avatar`, `Form`, `Table`, `Dropdown`, `Modal`, `Toast`
- All designed for dark mode by default

### Features

- Modal animations via Framer Motion
- Notifications via toast (shadcn or custom)
- Responsive mobile-first design

---

## 🧠 Zustand Stores

- `useAuthStore` → Handles auth, roles, ID/token
- `useLocaleStore` → Language / localization

---

## 🧰 Utils

Located in `/lib` or `/utils`:

- `clerk.ts` → Clerk-related actions (createUser, getUserByID, etc)
- `roles.ts` → Role check helpers
- `format.ts` → Currency/date formatter
- `billing.ts` → Helper to calculate bills (quantity × price + home visit fee)
- `notifications.ts` → Push notifications trigger logic

---

## ⚙️ Backend / Sanity Schema

### Documents:

- `customer`

  - id (Clerk ID)
  - name
  - phone
  - location
  - createdAt

- `item`

  - name
  - price
  - category (e.g., wiring, fan, switch)

- `bill`

  - customerRef
  - itemsUsed \[{itemRef, quantity, price}]
  - serviceType (repair/sale/custom)
  - locationType (shop/home)
  - totalAmount
  - createdAt

---

## 📦 Folder Structure

```
/app
  /login
  /admin
    /dashboard
    /customers
    /customers/[id]
    /billing
    /sales-report
    /settings
  /customer
    /home
    /book
    /profile
/components
  /ui
  /modals
  /forms
  /icons
/store
/utils
/lib
/styles
```

---

## ✅ LLM IDE Prompt Summary

> Create a full-stack React + Next.js (TypeScript) dark-mode web app for an electrician shop. Admins create users via Clerk. Customers log in with an ID and secret key. Use Zustand for role and localization, Socket.IO for real-time, Sanity.io as backend. Generate all pages, inputs, modals, dropdowns, animations, and utility functions as per project structure above.

---

## 📌 Next Steps

- [ ] Setup Clerk project & admin-only user creation
- [ ] Scaffolding page folders with UI components
- [ ] Zustand stores setup
- [ ] Basic Sanity schemas
- [ ] Socket.IO real-time channels for billing updates
- [ ] Toast system + modal interactions
- [ ] LLM IDE prompt test
