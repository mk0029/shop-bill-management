/**
 * Helper to send notifications to all admins for key events.
 * Wraps the /api/notifications/send endpoint with audience='admins'.
 * Use this in admin-side event handlers (bill create/update, inventory add, cashbook entry, etc.).
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
    } else {
      console.log('[AdminNotifier] Notified admins', result);
    }
    return result;
  } catch (e) {
    console.error('[AdminNotifier] Exception notifying admins', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}
