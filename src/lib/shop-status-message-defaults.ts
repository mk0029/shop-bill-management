export type ShopStatusKey = "offline" | "online" | "at_shop";

export type ShopStatusMessage = {
  title: string;
  body: string;
};

export type ShopStatusMessages = Record<ShopStatusKey, ShopStatusMessage>;

export const defaultShopStatusMessages: ShopStatusMessages = {
  offline: {
    title: "Shop is temporarily offline",
    body: "We are not available right now. You can still browse your bills and requests; we will update you when service resumes.",
  },
  online: {
    title: "Shop is available now",
    body: "We are available online and ready to help with bills, service requests, and support.",
  },
  at_shop: {
    title: "Shop is open for visits",
    body: "We are available at the shop now. You can visit us for service, repairs, and support.",
  },
};

export function normalizeShopStatusMessages(input: unknown): ShopStatusMessages {
  const value =
    typeof input === "object" && input !== null
      ? (input as Partial<Record<ShopStatusKey, Partial<ShopStatusMessage>>>)
      : {};

  return {
    offline: {
      title: String(value.offline?.title || defaultShopStatusMessages.offline.title).trim(),
      body: String(value.offline?.body || defaultShopStatusMessages.offline.body).trim(),
    },
    online: {
      title: String(value.online?.title || defaultShopStatusMessages.online.title).trim(),
      body: String(value.online?.body || defaultShopStatusMessages.online.body).trim(),
    },
    at_shop: {
      title: String(value.at_shop?.title || defaultShopStatusMessages.at_shop.title).trim(),
      body: String(value.at_shop?.body || defaultShopStatusMessages.at_shop.body).trim(),
    },
  };
}
