# Bill Book Backend (Sanity) — API and Data Model Guide

This document describes the Sanity-side data models, queries, security, and API integration required to support the new Bill Book feature and the following API routes:

- GET `/api/bill-book/[userId]/list`
- GET `/api/bill-book/[billId]/messages`
- POST `/api/bill-book/[billId]/messages`
- GET `/api/bill-book/[userId]/summary`

It also includes recommended schema fields, indexes, and migration notes for existing data.

---

## 1) Schemas

### 1.1 Bill Message (`billMessage`)
Bill-level message notes between Admin and Customer.

```ts
// sanity/schemas/billMessage.ts
export default {
  name: 'billMessage',
  type: 'document',
  title: 'Bill Message',
  fields: [
    {
      name: 'bill',
      type: 'reference',
      to: [{ type: 'bill' }],
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'sender',
      type: 'reference',
      to: [{ type: 'user' }],
      description: 'Actor who sent the message (admin or customer user)'
    },
    {
      name: 'recipient',
      type: 'reference',
      to: [{ type: 'user' }],
      validation: (Rule: any) => Rule.required(),
    },
    { name: 'content', type: 'text', rows: 4, validation: (Rule: any) => Rule.required() },
    { name: 'attachments', type: 'array', of: [{ type: 'file' }], options: { layout: 'grid' } },
    { name: 'status', type: 'string', options: { list: ['sent', 'delivered', 'seen'] }, initialValue: 'sent' },
    { name: 'isEncrypted', type: 'boolean', initialValue: false },
    { name: 'createdAt', type: 'datetime', initialValue: () => new Date().toISOString() },
    { name: 'updatedAt', type: 'datetime', initialValue: () => new Date().toISOString() },
  ],
};
```

Notes:
- `sender` may be optional on server creation if verified on API gateway; keep `recipient` required.
- `createdAt`/`updatedAt` are stored to enable stable ordering.

### 1.2 Bill (`bill`)
Ensure these fields are present; if not, add via migration:

```ts
// sanity/schemas/bill.ts (excerpt)
fields: [
  // ...existing fields
  { name: 'billId', type: 'string' },
  { name: 'billNumber', type: 'string' },
  { name: 'customer', type: 'reference', to: [{ type: 'user' }], validation: (Rule: any) => Rule.required() },
  { name: 'serviceType', type: 'string' },
  { name: 'locationType', type: 'string' },
  { name: 'subtotal', type: 'number' },
  { name: 'totalAmount', type: 'number' },
  { name: 'paidAmount', type: 'number' },
  { name: 'balanceAmount', type: 'number' },
  { name: 'status', type: 'string' },
  { name: 'createdAt', type: 'datetime', initialValue: () => new Date().toISOString() },
  { name: 'updatedAt', type: 'datetime', initialValue: () => new Date().toISOString() },
]
```

---

## 2) Queries (GROQ)

### 2.1 List Bills for a User
Used by GET `/api/bill-book/[userId]/list`

```groq
*[_type == "bill" && customer._ref == $userId] {
  _id,
  billId,
  billNumber,
  createdAt,
  status,
  serviceType,
  locationType,
  subtotal,
  totalAmount,
  paidAmount,
  balanceAmount,
  customer->{ _id, name }
} | order(createdAt desc)
```

### 2.2 Messages for a Bill
Used by GET `/api/bill-book/[billId]/messages`

```groq
*[_type == "billMessage" && bill._ref == $billId] | order(createdAt asc) {
  _id,
  bill,
  sender,
  recipient,
  content,
  attachments,
  status,
  createdAt,
  updatedAt,
  isEncrypted
}
```

### 2.3 Bill Summary for a User
Used by GET `/api/bill-book/[userId]/summary`

```groq
*[_type == "bill" && customer._ref == $userId] {
  _id,
  createdAt,
  totalAmount,
  paidAmount,
  balanceAmount,
  paymentStatus
}
```

Derive in API:
- `totalBills = count(bills)`
- `totalPaid = sum(paidAmount)`
- `totalOutstanding = sum(balanceAmount or (totalAmount - paidAmount))`
- `latestBillDate = max(createdAt)`

---

## 3) API Creation Pattern (Edge/Route Handlers)

Based on your current Next.js 15 codebase, API routes call the Sanity JS client directly. The main patterns:

- Read: `sanityClient.fetch(groq, params)`
- Create: `sanityClient.create({ _type: 'billMessage', ... })`
- Update: `sanityClient.patch(id).set({...}).commit()`

Security:
- If Clerk or a server token is available, verify `senderId`/`userId` and restrict customer access to only their own records.
- Admins can access any customer’s bill book.

Notifications:
- After creating a message, send notification to `recipient` via your `/api/notifications/send` endpoint.

---

## 4) Realtime Listeners

To keep message threads live, subscribe to `billMessage` document changes:

```ts
// Example: include billMessage in listen types
client.listen('*[_type in ["bill", "billMessage", /* other types */]]').subscribe({
  next: (update) => {
    const msg = update.result
    if (msg?._type === 'billMessage') {
      const billId = msg.bill?._ref || msg.bill
      if (billId) {
        // Inject into UI store/thread
      }
    }
  }
})
```

---

## 5) Indexes (Optional but Recommended)

For large datasets, request Sanity support for query performance. Recommended fields used in filters/sorts:

- `bill.customer._ref`
- `bill.createdAt`
- `billMessage.bill._ref`
- `billMessage.createdAt`

---

## 6) Migrations

Run these once if fields are missing or need backfilling.

### 6.1 Ensure `createdAt`/`updatedAt` on Bills
```js
// scripts/migrations/backfill-bill-dates.js
import { sanityClient } from '../lib/sanity'

async function run() {
  const bills = await sanityClient.fetch(`*[_type == "bill" && !defined(createdAt)]{ _id, _createdAt }`)
  for (const b of bills) {
    await sanityClient
      .patch(b._id)
      .set({ createdAt: b._createdAt, updatedAt: new Date().toISOString() })
      .commit()
  }
}
run().catch(console.error)
```

### 6.2 Introduce `billMessage` Type (no backfill required)
- Deploy schema.
- Optionally create a seed message for QA.

---

## 7) Access Control Model (Recommended)

- Customers:
  - Can fetch their bill list and summary.
  - Can fetch and post messages only for bills where they are `customer`.
- Admins:
  - Can access any user’s bill list, summary, and messages.

Implementation options:
- Verify user via Clerk on server and map to Sanity user `_id`.
- Or, if running with secretKey/customerId, ensure strict equality check in API before queries.

---

## 8) Message Creation — Server Flow

On POST `/api/bill-book/[billId]/messages`:

1. Validate inputs `content`, `recipientId`.
2. Optional: derive `senderId` from authenticated context.
3. Create `billMessage` document with references.
4. Fire-and-forget notification to `recipient`.
5. Return the created message document.

---

## 9) Attachment Handling (Optional Extension)

- Accept file uploads (Next.js API or direct Sanity asset upload) and push file references into `attachments`.
- Ensure messages remain lightweight; store large files as Sanity assets.

---

## 10) Testing Checklist

- __Bill List__: Bills resolve with `customer->{ _id, name }` and correct totals.
- __Messages__: Thread loads in ascending order by `createdAt`.
- __Create Message__: Document created with `bill`, `recipient`, content, timestamps.
- __Realtime__: New messages appear live without refresh.
- __Security__: Customer cannot access other users’ bills or messages.
- __Notifications__: Recipient receives FCM with correct `billId` and `messageId`.

---

## 11) Rollout Steps

1. Deploy updated schemas (`billMessage`, bill field additions if needed).
2. Run migrations for missing timestamps on `bill`.
3. Deploy the Next.js API routes.
4. Verify realtime listeners include `billMessage`.
5. QA end-to-end:
   - Admin/customer bill message notes
   - Offline queue recovery
   - Notifications

---

If you’d like, I can convert the above into Sanity Studio schema files and migration scripts under `scripts/` in this repo and open a PR for the CMS repo if it’s separate.
