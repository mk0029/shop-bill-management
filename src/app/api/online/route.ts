import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

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
    const { isOnline, atShop, note } = body || {};

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

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    console.error('POST /api/online error:', error);
    const status = error?.statusCode || 500;
    return NextResponse.json({ success: false, error: 'Failed to update online status' }, { status });
  }
}
