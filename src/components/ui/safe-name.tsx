import { safeUserName } from "@/lib/display-text";

export function UserDisplayName({
  name,
  fallback,
}: {
  name: unknown;
  fallback?: string;
}) {
  return <>{safeUserName(name, fallback)}</>;
}

export function SafeText({
  value,
  fallback,
}: {
  value: unknown;
  fallback?: string;
}) {
  return <>{safeUserName(value, fallback)}</>;
}
