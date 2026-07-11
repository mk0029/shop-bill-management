import { createHash, randomBytes } from "node:crypto";

const SERVER_SECRET = process.env.REGISTRATION_CSRF_SECRET || process.env.RECOVERY_TOKEN_SECRET || "registration-dev-secret-change-in-prod";

export function generateRequestId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(21);
  let id = "srn_";
  for (let i = 0; i < 21; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

export function generateDeviceToken(requestId: string): string {
  const hash = createHash("sha256")
    .update(`${requestId}:${SERVER_SECRET}:${Date.now()}`)
    .digest("hex");
  return hash.substring(0, 32);
}

export function verifyDeviceToken(requestId: string, token: string): boolean {
  const hash = createHash("sha256")
    .update(`${requestId}:${SERVER_SECRET}`)
    .digest("hex");
  return hash.substring(0, 32) === token;
}

export function generateRecoveryToken(userId: string): string {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256")
    .update(`${userId}:${raw}:${SERVER_SECRET}`)
    .digest("hex");
  return `${raw.substring(0, 16)}_${hash.substring(0, 32)}`;
}

export function verifyRecoveryToken(userId: string, token: string): boolean {
  const parts = token.split("_");
  if (parts.length !== 2) return false;
  const raw = parts[0];
  const hash = createHash("sha256")
    .update(`${userId}:${raw}:${SERVER_SECRET}`)
    .digest("hex");
  return hash.substring(0, 32) === parts[1];
}

export function generateSecretKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(16);
  let key = "";
  for (let i = 0; i < 16; i++) {
    key += chars[bytes[i] % chars.length];
  }
  return key;
}
