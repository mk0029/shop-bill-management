export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS
  const iosStandalone = (window.navigator as any).standalone;
  // Other browsers
  const mql = window.matchMedia && window.matchMedia("(display-mode: standalone)");
  return Boolean(iosStandalone) || Boolean(mql && mql.matches);
}
