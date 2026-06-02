import { getCookie } from "@/lib/cookies";

export function getShopAuthHeader() {
  if (typeof document === "undefined") return "";
  return getCookie("auth-storage") || "";
}

function toBase64Url(value: string) {
  try {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window
      .btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  } catch {
    return value;
  }
}

export function shopChatHeaders(): Record<string, string> {
  const auth = getShopAuthHeader();
  return auth ? { "X-Shop-Auth": toBase64Url(auth) } : {};
}
