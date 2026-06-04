import "server-only";
import { createHash } from "node:crypto";
import { sanityClient } from "@/lib/sanity";
import type { FcmDeviceInfo, RegisterFcmTokenInput } from "@/types/notifications";

export type ActiveFcmToken = {
  _id: string;
  userId: string;
  token: string;
  deviceId?: string;
  deviceName?: string;
  isActive: boolean;
  updatedAt?: string;
};

type SanityUserDeviceLimit = {
  _id: string;
  allowedDevicesCount?: number | null;
};

function tokenDocId(token: string) {
  return `userFcmToken.${createHash("sha256").update(token).digest("hex").slice(0, 40)}`;
}

function deviceDocId(userId: string, deviceId: string) {
  return `userFcmToken.${createHash("sha256").update(`${userId}:${deviceId}`).digest("hex").slice(0, 40)}`;
}

function clampAllowedDeviceCount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(2, Math.max(1, Math.trunc(parsed)));
}

export async function getAllowedDevicesCount(userId: string): Promise<number> {
  const user = await sanityClient.fetch<SanityUserDeviceLimit | null>(
    `*[_type=="user" && (_id==$id || clerkId==$id || customerId==$id) && isActive != false][0]{
      _id,
      allowedDevicesCount
    }`,
    { id: userId },
  );
  if (!user?._id) throw new Error("User not found");
  return clampAllowedDeviceCount(user.allowedDevicesCount);
}

export async function resolveUserId(userId: string): Promise<string> {
  const id = await sanityClient.fetch<string | null>(
    `*[_type=="user" && (_id==$id || clerkId==$id || customerId==$id) && isActive != false][0]._id`,
    { id: userId },
  );
  if (!id) throw new Error("User not found");
  return id;
}

export async function registerFcmToken(input: RegisterFcmTokenInput) {
  const token = String(input.token || "").trim();
  return registerUserDeviceSession({ ...input, token });
}

export async function registerUserDeviceSession(input: RegisterFcmTokenInput) {
  const token = String(input.token || "").trim();
  const requestedUserId = String(input.userId || "").trim();
  if (!requestedUserId) throw new Error("Missing userId");

  const [userId, allowedDevicesCount] = await Promise.all([
    resolveUserId(requestedUserId),
    getAllowedDevicesCount(requestedUserId),
  ]);

  const now = new Date().toISOString();
  const deviceInfo: FcmDeviceInfo = input.deviceInfo || {};
  const stableDeviceId = String(deviceInfo.deviceId || "").trim();
  if (!stableDeviceId && !token) throw new Error("Missing deviceId/token");
  const docId = stableDeviceId ? deviceDocId(userId, stableDeviceId) : tokenDocId(token);

  await sanityClient.createIfNotExists({
      _id: docId,
      _type: "userFcmToken",
      token,
      createdAt: now,
      user: { _type: "reference", _ref: userId },
      userId,
      deviceId: deviceInfo.deviceId || docId,
      isActive: true,
    });

  await sanityClient
    .patch(docId)
    .set({
      user: { _type: "reference", _ref: userId },
      userId,
      deviceId: deviceInfo.deviceId || docId,
      deviceName: deviceInfo.deviceName || deviceInfo.platform || "Device",
      platform: deviceInfo.platform || "",
      browser: deviceInfo.browser || "",
      os: deviceInfo.os || "",
      userAgent: deviceInfo.userAgent || "",
      isActive: true,
      updatedAt: now,
      lastUsedAt: now,
      lastLoginAt: now,
    })
    .set(token ? { token } : {})
    .commit({ autoGenerateArrayKeys: true });

  if (stableDeviceId) {
    await deactivateDuplicateDeviceDocs(userId, stableDeviceId, docId);
  }

  await sanityClient
    .patch(userId)
    .set({
      allowedDevicesCount,
      updatedAt: now,
    })
    .commit();

  await enforceUserFcmTokenLimit(
    userId,
    allowedDevicesCount,
    deviceInfo.deviceName || deviceInfo.platform || "another device",
    docId,
  );

  return { userId, tokenId: docId, allowedDevicesCount };
}

export async function unregisterFcmToken(userId: string, token: string) {
  const resolvedUserId = await resolveUserId(userId);
  const now = new Date().toISOString();
  await sanityClient
    .patch(tokenDocId(token))
    .set({ isActive: false, updatedAt: now })
    .unset(["lastUsedAt"])
    .commit()
    .catch(() => undefined);

  await removeLegacyUserToken(resolvedUserId, token).catch(() => undefined);
  return { userId: resolvedUserId };
}

export async function getActiveFcmTokensForUsers(userIds: string[]): Promise<ActiveFcmToken[]> {
  const ids = Array.from(new Set((userIds || []).map(String).filter(Boolean)));
  if (!ids.length) return [];
  return sanityClient.fetch<ActiveFcmToken[]>(
    `*[_type=="userFcmToken" && isActive == true && defined(token) && token != "" && userId in $ids] | order(updatedAt desc) {
      _id,
      userId,
      token,
      deviceId,
      deviceName,
      isActive,
      updatedAt
    }`,
    { ids },
  );
}

async function deactivateDuplicateDeviceDocs(userId: string, deviceId: string, keepDocId: string) {
  const duplicates = await sanityClient.fetch<Array<{ _id: string; token?: string; deviceName?: string }>>(
    `*[_type=="userFcmToken" && userId==$userId && deviceId==$deviceId && _id != $keepDocId && isActive == true]{
      _id,
      token,
      deviceName
    }`,
    { userId, deviceId, keepDocId },
  );
  if (!duplicates.length) return;
  const now = new Date().toISOString();
  await Promise.allSettled(
    duplicates.map((doc) =>
      sanityClient
        .patch(doc._id)
        .set({
          isActive: false,
          deactivatedReason: "LOGGED_IN_ON_ANOTHER_DEVICE",
          deactivatedAt: now,
          updatedAt: now,
        })
        .commit(),
    ),
  );
  await Promise.allSettled(
    duplicates.map((doc) =>
      notifyChatBackendDeviceRevoked({
        userId,
        deviceId,
        reason: "LOGGED_IN_ON_ANOTHER_DEVICE",
        loggedInOn: doc.deviceName,
      }),
    ),
  );
}

export async function getActiveTokenStringsForUsers(userIds: string[]): Promise<string[]> {
  const docs = await getActiveFcmTokensForUsers(userIds);
  return Array.from(new Set(docs.map((doc) => doc.token).filter(Boolean)));
}

export async function deactivateFcmTokens(tokens: string[]) {
  const unique = Array.from(new Set((tokens || []).map(String).filter(Boolean)));
  if (!unique.length) return;
  const now = new Date().toISOString();
  const docs = await sanityClient.fetch<Array<{ _id: string; userId?: string }>>(
    `*[_type=="userFcmToken" && token in $tokens]{_id,userId}`,
    { tokens: unique },
  );
  await Promise.allSettled(
    docs.map((doc) =>
      sanityClient.patch(doc._id).set({ isActive: false, updatedAt: now }).commit(),
    ),
  );

  const users = Array.from(new Set(docs.map((doc) => doc.userId).filter(Boolean)));
  await Promise.allSettled(users.map((userId) => removeLegacyUserTokens(String(userId), unique)));
}

async function enforceUserFcmTokenLimit(
  userId: string,
  allowedDevicesCount: number,
  latestDeviceName: string,
  keepDocId: string,
) {
  const active = await sanityClient.fetch<Array<{ _id: string; token?: string; deviceId?: string; deviceName?: string; updatedAt?: string }>>(
    `*[_type=="userFcmToken" && userId==$userId && isActive == true] | order(updatedAt desc) {
      _id,
      token,
      deviceId,
      deviceName,
      updatedAt
    }`,
    { userId },
  );
  const keep = active.find((doc) => doc._id === keepDocId);
  const ordered = [
    ...(keep ? [keep] : []),
    ...active.filter((doc) => doc._id !== keepDocId),
  ];
  const stale = ordered.slice(allowedDevicesCount);
  if (!stale.length) return;
  const now = new Date().toISOString();
  await Promise.allSettled(
    stale.map((doc) =>
      sanityClient
        .patch(doc._id)
        .set({
          isActive: false,
          deactivatedReason: "DEVICE_LIMIT_EXCEEDED",
          replacedByDeviceName: latestDeviceName,
          deactivatedAt: now,
          updatedAt: now,
        })
        .commit(),
    ),
  );
  await Promise.allSettled(
    stale.map((doc) =>
      notifyChatBackendDeviceRevoked({
        userId,
        deviceId: doc.deviceId,
        reason: "DEVICE_LIMIT_EXCEEDED",
        loggedInOn: latestDeviceName,
      }),
    ),
  );
  await removeLegacyUserTokens(userId, stale.map((doc) => doc.token).filter(Boolean) as string[]);
}

async function notifyChatBackendDeviceRevoked(input: {
  userId: string;
  deviceId?: string;
  reason: "DEVICE_LIMIT_EXCEEDED" | "LOGGED_IN_ON_ANOTHER_DEVICE";
  loggedInOn?: string;
}) {
  const baseUrl = String(process.env.NEXT_PUBLIC_SHOP_CHAT_URL || process.env.SHOP_CHAT_URL || "").replace(/\/+$/, "");
  const token = String(process.env.CHAT_SYNC_TOKEN || process.env.CHAT_BACKEND_JWT_SECRET || process.env.JWT_SECRET || "");
  if (!baseUrl || !token || !input.deviceId) return;

  await fetch(`${baseUrl}/internal/session/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userId: input.userId,
      deviceId: input.deviceId,
      reason: input.reason,
      loggedInOn: input.loggedInOn,
      message: "Your account has been logged out from this device because it was logged in on another device.",
    }),
  }).catch((error) => {
    console.warn("[DeviceSession] realtime revoke failed", error);
  });
}

async function removeLegacyUserToken(userId: string, token: string) {
  await removeLegacyUserTokens(userId, [token]);
}

async function removeLegacyUserTokens(userId: string, tokens: string[]) {
  const unique = new Set(tokens.filter(Boolean));
  if (!unique.size) return;
  const user = await sanityClient.fetch<{
    fcmTokens?: string[] | null;
    fcmTokensProd?: string[] | null;
    fcmTokensDev?: string[] | null;
  } | null>(
    `*[_type=="user" && _id==$userId][0]{fcmTokens,fcmTokensProd,fcmTokensDev}`,
    { userId },
  );
  if (!user) return;
  const filter = (arr?: string[] | null) => (Array.isArray(arr) ? arr.filter((t) => !unique.has(t)) : []);
  await sanityClient
    .patch(userId)
    .set({
      fcmTokens: filter(user.fcmTokens),
      fcmTokensProd: filter(user.fcmTokensProd),
      fcmTokensDev: filter(user.fcmTokensDev),
      updatedAt: new Date().toISOString(),
    })
    .commit();
}
