"use client";

import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";
import { getFirebaseApp } from "./app";

export type ForegroundMessageHandler = (payload: MessagePayload) => void;

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  try {
    if (!(await isSupported())) return null;
    const app = getFirebaseApp();
    return app ? getMessaging(app) : null;
  } catch {
    return null;
  }
}

export async function isMessagingAvailable() {
  return Boolean(await getMessagingIfSupported());
}

export async function ensureMessagingServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return undefined;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    return existing || navigator.serviceWorker.register("/firebase-messaging-sw.js");
  } catch (error) {
    console.warn("[FCM] Service worker unavailable", error);
    return undefined;
  }
}

export async function getFcmToken(options: { forceRefresh?: boolean } = {}) {
  const messaging = await getMessagingIfSupported();
  if (!messaging || typeof window === "undefined") return null;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("[FCM] Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY");
    return null;
  }
  try {
    const serviceWorkerRegistration = await ensureMessagingServiceWorker();
    if (options.forceRefresh) {
      await deleteToken(messaging).catch(() => undefined);
    }
    return (
      (await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration,
      })) || null
    );
  } catch (error) {
    console.warn("[FCM] Failed to get token", error);
    return null;
  }
}

export async function onForegroundMessage(handler: ForegroundMessageHandler) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => undefined;
  return onMessage(messaging, handler);
}
