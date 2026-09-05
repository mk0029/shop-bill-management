/**
 * Helper to send notifications to all admins for key events.
 * Wraps the /api/notifications/send endpoint with audience='admins'.
 *
 * This module is imported by tool-rental-service, which is bundled into the
 * browser (rent-tools-client.tsx). It must therefore stay client-safe: no
 * server-only imports, no direct calls into the server dispatcher. The
 * /api/notifications/send endpoint re-enters the app server-side and benefits
 * from the central dispatcher's cached FCM auth tokens and 5s token cache.
 */
export async function notifyAdmins(payload: {
  title: string;
  body: string;
  data?: Record<string, string>;
  excludeUserIds?: string[];
  eventType?: string;
  eventId?: string;
}) {
  try {
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audience: 'admins',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        eventType: payload.eventType,
        eventId: payload.eventId,
        excludeUserIds: Array.isArray(payload.excludeUserIds) ? payload.excludeUserIds : undefined,
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[AdminNotifier] Failed to notify admins', result);
    }
    return result;
  } catch (e) {
    console.error('[AdminNotifier] Exception notifying admins', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}