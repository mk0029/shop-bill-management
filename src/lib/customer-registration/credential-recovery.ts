import { sanityClient } from "@/lib/sanity";
import { sendViaWaBotServer } from "@/lib/wa-bot-server";
import { normalizePhone } from "./validation";

export interface UserLookup {
  found: boolean;
  user?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    customerId: string;
    secretKey: string;
  };
}

export async function findUserByIdentifier(
  identifier: string,
  type: "email" | "phone",
): Promise<UserLookup> {
  if (type === "phone") {
    const rawDigits = identifier.replace(/\D/g, "");
    const possibleFormats = [identifier];
    if (rawDigits.length === 10) possibleFormats.push(rawDigits);
    if (rawDigits.length === 12 && rawDigits.startsWith("91")) possibleFormats.push(rawDigits.slice(2));
    const user = await sanityClient.fetch(
      `*[_type == "user" && role == "customer" && phone in $formats && isActive == true][0] {
        _id, name, email, phone, customerId, secretKey
      }`,
      { formats: possibleFormats },
    );
    if (!user) return { found: false };
    return { found: true, user };
  }

  const user = await sanityClient.fetch(
    `*[_type == "user" && role == "customer" && email == $identifier && isActive == true][0] {
      _id, name, email, phone, customerId, secretKey
    }`,
    { identifier },
  );
  if (!user) return { found: false };
  return { found: true, user };
}

function buildWaCredentialMessage(name: string, customerId: string, secretKey: string): string {
  return [
    `Hello ${name},`,
    "",
    "Your Jambh Electrics login credentials:",
    "",
    `Customer ID: ${customerId}`,
    `Secret Key: ${secretKey}`,
    "",
    "Please keep these details secure.",
    "For support, contact Jambh Electrics.",
  ].join("\n");
}

export async function processRecovery(
  identifier: string,
  type: "email" | "phone",
): Promise<{ sent: boolean; method?: "email" | "whatsapp" }> {
  const lookup = await findUserByIdentifier(identifier, type);

  if (!lookup.found || !lookup.user) {
    return { sent: false };
  }

  const user = lookup.user;

  if (type === "email" && user.email) {
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
          customerId: user.customerId,
          secretKey: user.secretKey,
        }),
      });
      if (!res.ok) {
        console.error("Recovery email send failed:", await res.text().catch(() => ""));
        return { sent: false, method: "email" };
      }
      return { sent: true, method: "email" };
    } catch (err) {
      console.error("Recovery email send error:", err);
      return { sent: false, method: "email" };
    }
  }

  if (type === "phone" && user.phone) {
    const raw = user.phone.replace(/\D/g, "");
    const waPhone = raw.length === 10 ? `91${raw}` : raw;
    const result = await sendViaWaBotServer({
      phone: waPhone,
      message: buildWaCredentialMessage(user.name, user.customerId, user.secretKey),
    });
    if (!result.ok || result.failed > 0) {
      console.error("WA credential send failed:", result.error);
      return { sent: false, method: "whatsapp" };
    }
    return { sent: true, method: "whatsapp" };
  }

  return { sent: false };
}
