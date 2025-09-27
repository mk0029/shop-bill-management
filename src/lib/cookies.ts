export type CookieOptions = {
  days?: number; // number of days until expiry. If not provided, cookie becomes a session cookie
  path?: string;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  domain?: string;
};

function buildCookieString(name: string, value: string, opts: CookieOptions = {}): string {
  // Encode value to be safe
  const encValue = encodeURIComponent(value);
  const parts: string[] = [`${name}=${encValue}`];

  if (opts.days && Number.isFinite(opts.days)) {
    const date = new Date();
    date.setTime(date.getTime() + opts.days * 24 * 60 * 60 * 1000);
    parts.push(`Expires=${date.toUTCString()}`);
    parts.push(`Max-Age=${Math.floor(opts.days * 24 * 60 * 60)}`);
  }

  parts.push(`Path=${opts.path || '/'}`);

  // In modern browsers, secure contexts are recommended
  const secure = opts.secure ?? (typeof window !== 'undefined' && window.location.protocol === 'https:');
  if (secure) parts.push('Secure');

  const sameSite = opts.sameSite ?? 'Lax';
  parts.push(`SameSite=${sameSite}`);

  if (opts.domain) parts.push(`Domain=${opts.domain}`);

  return parts.join('; ');
}

export function setCookie(name: string, value: string, opts: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;
  document.cookie = buildCookieString(name, value, opts);
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    const [k, ...rest] = c.split('=');
    if (k === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return null;
}

export function deleteCookie(name: string, opts: Omit<CookieOptions, 'days'> = {}): void {
  if (typeof document === 'undefined') return;
  // Set expiry in the past to delete
  document.cookie = buildCookieString(name, '', { ...opts, days: -1 });
}
