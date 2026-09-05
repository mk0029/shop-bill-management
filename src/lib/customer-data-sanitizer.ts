/**
 * Server-side sanitizers for customer-facing reads.
 *
 * Bills and rentals come from the new DBs through server routes, but the raw
 * documents use `...` projections that can include admin-only fields such as
 * `internalNotes`, purchase/cost prices, margins, supplier refs, and token data.
 * Before returning anything to a customer session we strip those and keep only a
 * whitelisted display shape. Pure functions — safe to import anywhere.
 */

// Defense in depth: drop any key that may carry admin-sensitive info. Applied
// recursively AFTER whitelisting so dynamic/unknown fields can never leak.
const BLOCKED_KEY_RE =
  /(internal\.?note|secret|fcm.?token|fcmTokens|acquisition|invested|purchase(?:\s*\.?\s*)?price|cost(?:\s*\.?\s*)?price|cost|buy(?:ing)?(?:\s*\.?\s*)?price|trade(?:\s*\.?\s*)?price|whole(?:sale)?(?:\s*\.?\s*)?price|dealer(?:\s*\.?\s*)?price|supplier(?:\s*\.?\s*)?(?:price|ref)|margin|merchant|wholesaleAmount|purchaseTotal)/i;

const BILL_ALLOWED = new Set([
  "_id",
  "_type",
  "_createdAt",
  "_updatedAt",
  "createdAt",
  "updatedAt",
  "billId",
  "billNumber",
  "billDate",
  "serviceType",
  "locationType",
  "serviceDate",
  "dueDate",
  "visitingCharges",
  "transportationFee",
  "repairFee",
  "laborCharges",
  "subtotal",
  "taxAmount",
  "discount",
  "totalAmount",
  "paymentStatus",
  "paymentMethod",
  "paidAmount",
  "balanceAmount",
  "status",
  "priority",
  "notes",
  "customerId",
  "customerName",
  "customerPhone",
  "customer",
  "technician",
  "items",
]);

const ITEM_ALLOWED = new Set([
  "_key",
  "itemName",
  "productName",
  "productId",
  "product",
  "quantity",
  "qty",
  "rate",
  "unitRate",
  "unitPrice",
  "price",
  "sellingPrice",
  "amount",
  "total",
  "subtotal",
  "category",
  "brand",
  "serviceType",
]);

const PRODUCT_ALLOWED = new Set([
  "_id",
  "_type",
  "name",
  "productName",
  "description",
  "specifications",
  "brand",
  "category",
]);

const CUSTOMER_ALLOWED = new Set([
  "_id",
  "customerId",
  "name",
  "nickname",
  "phone",
  "email",
  "location",
  "role",
]);

const TECHNICIAN_ALLOWED = new Set(["_id", "name", "nickname", "phone", "email"]);

const RENTAL_ALLOWED = new Set([
  "_id",
  "_type",
  "_createdAt",
  "_updatedAt",
  "createdAt",
  "updatedAt",
  "customerId",
  "customerRefId",
  "customerName",
  "customerPhone",
  "toolId",
  "toolName",
  "toolCode",
  "durationType",
  "durationValue",
  "rentStartTime",
  "expectedReturnTime",
  "actualReturnTime",
  "rentAmount",
  "depositAmount",
  "paidAmount",
  "isPaid",
  "paymentStatus",
  "rentalStatus",
  "extraChargeAmount",
  "totalAmount",
  "currentTotalAmount",
]);

function stripBlocked(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripBlocked);
  if (obj && typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (BLOCKED_KEY_RE.test(key)) continue;
      out[key] = stripBlocked(value);
    }
    return out;
  }
  return obj;
}

function pickKeys(obj: unknown, allowed: Set<string>): Record<string, unknown> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return (obj as Record<string, unknown>) || {};
  }
  const source = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

function sanitizeCustomer(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const clean = stripBlocked(raw) as Record<string, unknown>;
  return pickKeys(clean, CUSTOMER_ALLOWED);
}

function sanitizeTechnician(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return typeof raw === "string" ? { name: raw } : raw;
  }
  const clean = stripBlocked(raw) as Record<string, unknown>;
  return pickKeys(clean, TECHNICIAN_ALLOWED);
}

function sanitizeProduct(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const clean = stripBlocked(raw) as Record<string, unknown>;
  return pickKeys(clean, PRODUCT_ALLOWED);
}

function sanitizeItem(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const clean = stripBlocked(raw) as Record<string, unknown>;
  const out = pickKeys(clean, ITEM_ALLOWED);
  if (clean.product) out.product = sanitizeProduct(clean.product);
  return out;
}

export function sanitizeBillForCustomer(bill: Record<string, unknown>): Record<string, unknown> {
  if (!bill || typeof bill !== "object") return bill;
  const clean = stripBlocked(bill) as Record<string, unknown>;
  const out = pickKeys(clean, BILL_ALLOWED);

  if (clean.customer !== undefined) out.customer = sanitizeCustomer(clean.customer);
  if (clean.customerId === undefined && clean.customer) {
    const c = clean.customer as Record<string, unknown>;
    if (typeof c?.customerId === "string") out.customerId = c.customerId;
  }

  if (clean.technician !== undefined) out.technician = sanitizeTechnician(clean.technician);

  if (Array.isArray(clean.items)) out.items = clean.items.map(sanitizeItem);

  return out;
}

export function sanitizeRentalForCustomer(rental: Record<string, unknown>): Record<string, unknown> {
  if (!rental || typeof rental !== "object") return rental;
  const clean = stripBlocked(rental) as Record<string, unknown>;
  return pickKeys(clean, RENTAL_ALLOWED);
}