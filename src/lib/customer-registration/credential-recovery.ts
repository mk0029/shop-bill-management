import { sanityClient } from "@/lib/sanity";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { normalizePhone, getPhoneFormats } from "@/lib/phone-utils";

export interface UserLookup {
  found: boolean;
  pendingRequest?: boolean;
  disabled?: boolean;
  user?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    customerId: string;
    secretKey: string;
    isActive?: boolean;
  };
}

const USER_FIELDS = `_id, name, email, phone, customerId, secretKey, isActive`;

export async function findUserByIdentifier(
  identifier: string,
  type: "email" | "phone",
): Promise<UserLookup> {
  const email = type === "email" ? identifier : null;
  const phoneDigits = type === "phone" ? identifier.replace(/\D/g, "") : null;
  const normalizedPhone = phoneDigits ? normalizePhone(phoneDigits) : null;
  const phoneFormats = normalizedPhone ? getPhoneFormats(normalizedPhone) : [];

  console.log("Recovery lookup:", { email, normalizedPhone, phoneFormats: phoneFormats.slice(0, 3) });

  const queries: Promise<{ by: string; result: any }>[] = [];

  if (email) {
    queries.push(
      sanityClient
        .fetch(
          `*[_type == "user" && defined(email) && lower(email) == lower($email)][0] { ${USER_FIELDS} }`,
          { email },
        )
        .then((r) => ({ by: "email", result: r })),
    );
  }

  if (phoneFormats.length > 0) {
    queries.push(
      sanityClient
        .fetch(
          `*[_type == "user" && (normalizedPhone == $normalizedPhone || phone in $formats)][0] { ${USER_FIELDS} }`,
          { normalizedPhone, formats: phoneFormats },
        )
        .then((r) => ({ by: "phone", result: r })),
    );
  }

  const results = await Promise.all(queries);
  const hit = results.find((r) => r.result);

  if (hit) {
    return { found: true, user: hit.result };
  }

  const pendingQueries: Promise<{ by: string; result: any }>[] = [];
  const pendingClients = [sanityClient, getSanityClient("operations")];

  for (const client of pendingClients) {
    if (email) {
      pendingQueries.push(
        client
          .fetch(
            `*[_type == "customerRequest" && status == "pending" && defined(email) && lower(email) == lower($email)][0] { _id, name, email, phone }`,
            { email },
          )
          .then((r) => ({ by: "email", result: r })),
      );
    }

    if (phoneFormats.length > 0) {
      pendingQueries.push(
        client
          .fetch(
            `*[_type == "customerRequest" && status == "pending" && (normalizedPhone == $normalizedPhone || phone in $formats)][0] { _id, name, email, phone }`,
            { normalizedPhone, formats: phoneFormats },
          )
          .then((r) => ({ by: "phone", result: r })),
      );
    }
  }

  const pendingResults = await Promise.all(pendingQueries);
  const pendingHit = pendingResults.find((r) => r.result);

  if (pendingHit) {
    console.warn("Recovery: identifier belongs to a pending request:", identifier);
    return { found: false, pendingRequest: true };
  }

  console.warn("Recovery: no user or request found for identifier:", identifier, "type:", type);
  return { found: false };
}

async function sendRecoveryEmail(user: { email: string; name: string; phone: string; secretKey: string }): Promise<boolean> {
  try {
    const internalToken = process.env.RECOVERY_INTERNAL_TOKEN;
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${origin}/api/public/auth/send-recovery-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalToken ? { Authorization: `Bearer ${internalToken}` } : {}),
      },
        body: JSON.stringify({
          to: user.email,
          name: user.name,
          phone: user.phone,
          secretKey: user.secretKey,
        }),
    });
    if (!res.ok) {
      console.error("Recovery email send failed:", await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Recovery email send error:", err);
    return false;
  }
}

export async function processRecovery(
  identifier: string,
  type: "email" | "phone",
): Promise<{ sent: boolean; found: boolean; pendingRequest?: boolean; disabled?: boolean; methods?: { email: boolean } }> {
  const lookup = await findUserByIdentifier(identifier, type);

  if (!lookup.found || !lookup.user) {
    return { sent: false, found: false, pendingRequest: lookup.pendingRequest };
  }

  if (lookup.user.isActive === false) {
    return { sent: false, found: true, disabled: true };
  }

  const user = lookup.user;

  const emailOk =
    user.email ? await sendRecoveryEmail({ email: user.email, name: user.name, phone: user.phone || "", secretKey: user.secretKey }) : false;

  const methods = { email: emailOk };
  const sent = emailOk;

  return { sent, found: true, methods };
}
