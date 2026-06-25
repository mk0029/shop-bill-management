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

type LegacyUserTokens = {
  _id: string;
  fcmTokens?: string[] | null;
  fcmTokensProd?: string[] | null;
  fcmTokensDev?: string[] | null;
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
  return Math.min(1, Math.max(1, Math.trunc(parsed)));
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
  const requestedUserId = String(input.userId || "").trim();
  if (!requestedUserId) throw new Error("Missing userId");
  if (!token) throw new Error("Missing token");

  const userId = await resolveUserId(requestedUserId);
  console.log("[FCM_TRACE] register_token_user_id", userId);
  const now = new Date().toISOString();
  const deviceInfo: FcmDeviceInfo = input.deviceInfo || {};
  const stableDeviceId = String(deviceInfo.deviceId || "").trim();
  const docId = stableDeviceId ? deviceDocId(userId, stableDeviceId) : tokenDocId(token);

  await sanityClient.createIfNotExists({
    _id: docId,
    _type: "userFcmToken",
    token,
    createdAt: now,
    user: { _type: "reference", _ref: userId },
    userId,
    deviceId: stableDeviceId || docId,
    isActive: true,
  });

  await sanityClient
    .patch(docId)
    .set({
      user: { _type: "reference", _ref: userId },
      userId,
      deviceId: stableDeviceId || docId,
      deviceName: deviceInfo.deviceName || deviceInfo.platform || "Device",
      platform: deviceInfo.platform || "",
      browser: deviceInfo.browser || "",
      os: deviceInfo.os || "",
      userAgent: deviceInfo.userAgent || "",
      token,
      isActive: true,
      updatedAt: now,
      lastUsedAt: now,
    })
    .unset(["deactivatedReason", "deactivatedAt", "replacedByDeviceName"])
    .commit({ autoGenerateArrayKeys: true });

  if (stableDeviceId) {
    await deactivateDuplicateDeviceDocs(userId, stableDeviceId, docId, {
      notifyRevokedDevices: false,
      reason: "FCM_TOKEN_REFRESH",
    });
  }

  return { userId, tokenId: docId };
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
    await deactivateDuplicateDeviceDocs(userId, stableDeviceId, docId, {
      notifyRevokedDevices: false,
      reason: "LOGGED_IN_ON_ANOTHER_DEVICE",
    });
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

export async function getDeviceSessionStatus(input: { userId: string; deviceId: string }) {
  const requestedUserId = String(input.userId || "").trim();
  const deviceId = String(input.deviceId || "").trim();
  if (!requestedUserId || !deviceId) throw new Error("Missing userId/deviceId");
  const userId = await resolveUserId(requestedUserId);
  const doc = await sanityClient.fetch<{
    _id: string;
    isActive?: boolean | null;
    deactivatedReason?: string | null;
    replacedByDeviceName?: string | null;
    deviceName?: string | null;
  } | null>(
    `*[_type=="userFcmToken" && userId==$userId && deviceId==$deviceId] | order(updatedAt desc)[0]{
      _id,
      isActive,
      deactivatedReason,
      replacedByDeviceName,
      deviceName
    }`,
    { userId, deviceId },
  );
  if (!doc?._id) return { success: true, known: false, active: true, userId, deviceId };
  return {
    success: true,
    known: true,
    active: doc.isActive !== false,
    reason: doc.deactivatedReason || "",
    loggedInOn: doc.replacedByDeviceName || "",
    deviceName: doc.deviceName || "",
    userId,
    deviceId,
  };
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
  const resolvedIds = await resolveUserIdsForNotificationTargets(ids);
  const lookupIds = Array.from(new Set([...ids, ...resolvedIds]));
  console.log("[FCM_TRACE] receiver_id", lookupIds.join(","));
  const tokenDocs = await sanityClient.fetch<ActiveFcmToken[]>(
    `*[_type=="userFcmToken" && isActive == true && defined(token) && token != "" && (userId in $ids || user._ref in $ids)] | order(updatedAt desc) {
      _id,
      userId,
      token,
      deviceId,
      deviceName,
      isActive,
      updatedAt
    }`,
    { ids: lookupIds },
  );

  const legacyUsers = await sanityClient.fetch<LegacyUserTokens[]>(
    `*[_type=="user" && _id in $ids]{
      _id,
      fcmTokens,
      fcmTokensProd,
      fcmTokensDev
    }`,
    { ids: lookupIds },
  );

  const legacyDocs: ActiveFcmToken[] = [];
  for (const user of legacyUsers || []) {
    const tokens = [
      ...(Array.isArray(user.fcmTokens) ? user.fcmTokens : []),
      ...(Array.isArray(user.fcmTokensProd) ? user.fcmTokensProd : []),
      ...(Array.isArray(user.fcmTokensDev) ? user.fcmTokensDev : []),
    ];
    for (const token of tokens) {
      if (!token) continue;
      legacyDocs.push({
        _id: `legacy.${user._id}.${createHash("sha256").update(token).digest("hex").slice(0, 12)}`,
        userId: user._id,
        token,
        isActive: true,
      });
    }
  }

  const byToken = new Map<string, ActiveFcmToken>();
  for (const doc of [...tokenDocs, ...legacyDocs]) {
    if (doc.token && !byToken.has(doc.token)) byToken.set(doc.token, doc);
  }
  console.log("[FCM_TRACE] receiver_token_found", byToken.size > 0);
  console.log("[FCM_TRACE] token_count", byToken.size);
  return Array.from(byToken.values());
}

async function resolveUserIdsForNotificationTargets(ids: string[]) {
  if (!ids.length) return [];
  const resolved = await sanityClient.fetch<string[]>(
    `*[_type=="user" && (_id in $ids || clerkId in $ids || customerId in $ids) && isActive != false]._id`,
    { ids },
  );
  return Array.from(new Set((resolved || []).map(String).filter(Boolean)));
}

async function deactivateDuplicateDeviceDocs(
  userId: string,
  deviceId: string,
  keepDocId: string,
  options: { notifyRevokedDevices: boolean; reason: string },
) {
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
          deactivatedReason: options.reason,
          deactivatedAt: now,
          updatedAt: now,
        })
        .commit(),
    ),
  );
  if (options.notifyRevokedDevices) {
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
  if (!keep) return;
  const ordered = [
    keep,
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
      doc.deviceId && doc.deviceId !== keep?.deviceId
        ? notifyChatBackendDeviceRevoked({
            userId,
            deviceId: doc.deviceId,
            reason: "DEVICE_LIMIT_EXCEEDED",
            loggedInOn: latestDeviceName,
          })
        : Promise.resolve(),
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
