import "server-only";
import { createClient } from "@sanity/client";
import {
  defaultShopStatusMessages,
  normalizeShopStatusMessages,
  type ShopStatusKey,
  type ShopStatusMessages,
} from "@/lib/shop-status-message-defaults";

const SETTINGS_ID = "shopStatusNotificationMessages";

function getClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "idji8ni7";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "live-shop";
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

  if (!token) {
    throw new Error("Sanity write token is not configured");
  }

  return createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion: "2024-01-01",
    perspective: "published",
  });
}

export function getShopStatusMessage(messages: ShopStatusMessages, status: ShopStatusKey) {
  return messages[status] || defaultShopStatusMessages[status];
}

export async function getShopStatusMessages() {
  const client = getClient();
  const doc = await client.getDocument<{ messages?: unknown }>(SETTINGS_ID);
  if (!doc) return defaultShopStatusMessages;
  return normalizeShopStatusMessages(doc.messages);
}

export async function saveShopStatusMessages(messages: unknown) {
  const normalized = normalizeShopStatusMessages(messages);
  const client = getClient();
  await client.createOrReplace({
    _id: SETTINGS_ID,
    _type: "shopStatusNotificationSettings",
    messages: normalized,
    updatedAt: new Date().toISOString(),
  });
  return normalized;
}
