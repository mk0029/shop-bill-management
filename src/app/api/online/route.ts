import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { sendToAll } from '@/lib/notification-service';

// Ensure this API is always dynamic and not cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'idji8ni7';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'live-shop';
const apiVersion = '2024-01-01';
// Prefer server token if provided; never expose this to browser
const token = process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN || '';

const serverClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

export async function GET() {
  try {
    // Ensure singleton exists
    const existing = await serverClient.fetch(`*[_type == "online" && _id == "onlineStatus"][0]`);
    if (existing) {
      return NextResponse.json({ success: true, data: existing }, { status: 200 });
    }

    const created = await serverClient.create({
      _id: 'onlineStatus',
      _type: 'online',
      isOnline: false,
      atShop: false,
      note: '',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: created }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/online error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch/init online status' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { isOnline, atShop, note, excludeTokens } = body || {} as { isOnline?: boolean; atShop?: boolean; note?: string; excludeTokens?: string[] };

    const patchSet: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (typeof isOnline === 'boolean') patchSet.isOnline = isOnline;
    if (typeof atShop === 'boolean') patchSet.atShop = atShop;
    if (typeof note === 'string') patchSet.note = note;

    // Ensure document exists first
    const existing = await serverClient.fetch(`*[_type == "online" && _id == "onlineStatus"][0]`);
    if (!existing) {
      await serverClient.create({
        _id: 'onlineStatus',
        _type: 'online',
        isOnline: typeof isOnline === 'boolean' ? isOnline : false,
        atShop: typeof atShop === 'boolean' ? atShop : false,
        note: typeof note === 'string' ? note : '',
        updatedAt: new Date().toISOString(),
      });
    }

    const updated = await serverClient
      .patch('onlineStatus')
      .set(patchSet)
      .commit({ returnDocuments: true });

    // Decide if status changed and broadcast FCM notifications
    const prevStatus = (() => {
      if (!existing?.isOnline) return 'offline' as const;
      return existing?.atShop ? 'at_shop' as const : 'online' as const;
    })();
    const newStatus = (() => {
      const nextOnline = typeof isOnline === 'boolean' ? isOnline : existing?.isOnline;
      const nextAtShop = typeof atShop === 'boolean' ? atShop : existing?.atShop;
      if (!nextOnline) return 'offline' as const;
      return nextAtShop ? 'at_shop' as const : 'online' as const;
    })();

    if (prevStatus !== newStatus) {
      try {
        const timestamp = new Date().toISOString();
        if (newStatus === 'offline') {
          await sendToAll('Shop is Offline', 'We are temporarily unavailable. We\'ll notify you when we\'re Available.', {
            status: 'offline',
            type: 'shop_status',
            updatedAt: timestamp,
          }, Array.isArray(excludeTokens) ? excludeTokens : undefined);
        } else if (newStatus === 'online') {
          await sendToAll('Shop is Available', 'We\'re now Available to serve you.', {
            status: 'online',
            type: 'shop_status',
            updatedAt: timestamp,
          }, Array.isArray(excludeTokens) ? excludeTokens : undefined);
        }
      } catch (e) {
        console.error('FCM broadcast error (/api/online):', e);
      }
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    console.error('POST /api/online error:', error);
    const status = error?.statusCode || 500;
    return NextResponse.json({ success: false, error: 'Failed to update online status' }, { status });
  }
}
