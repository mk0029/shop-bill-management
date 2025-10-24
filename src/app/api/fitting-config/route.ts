import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { auth } from '@clerk/nextjs/server';

// Sanity client
const getSanityClient = () => {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'idji8ni7';
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'live-shop';
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN;
  if (!token) {
    console.error('Sanity API token is not configured');
    throw new Error('Server configuration error');
  }
  return createClient({ projectId, dataset, token, useCdn: false, apiVersion: '2024-01-01', perspective: 'published' });
};

export interface FittingComponent {
  key: string;
  label: string;
  pointsPerUnit: number;
  order?: number;
}
export interface FittingConfigDoc {
  _id: 'fittingConfig';
  _type: 'fitting_config';
  components: FittingComponent[];
  updatedAt: string;
}

const DEFAULT_COMPONENTS: FittingComponent[] = [
  { key: 'switches', label: 'Switches', pointsPerUnit: 1, order: 1 },
  { key: 'regulators', label: 'Fan Regulators', pointsPerUnit: 1, order: 2 },
  { key: 'mcb', label: 'MCB', pointsPerUnit: 2, order: 3 },
  { key: 'rccb', label: 'RCCB', pointsPerUnit: 2, order: 4 },
  { key: 'indicators', label: 'Indicators', pointsPerUnit: 1, order: 5 },
  { key: 'tvSockets', label: 'TV Sockets', pointsPerUnit: 1, order: 6 },
];

export async function GET() {
  try {
    const client = getSanityClient();
    const doc = await client.getDocument<FittingConfigDoc>('fittingConfig');
    if (!doc) {
      const created = await client.create({
        _id: 'fittingConfig',
        _type: 'fitting_config',
        components: DEFAULT_COMPONENTS,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, data: created });
    }
    return NextResponse.json({ success: true, data: doc });
  } catch (e) {
    console.error('GET /api/fitting-config error:', e);
    return NextResponse.json({ success: false, error: 'Failed to fetch fitting config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const role = (sessionClaims as any)?.role || (sessionClaims as any)?.publicMetadata?.role;
    if (role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

    const payload = (body ?? {}) as Partial<{ components: FittingComponent[] }>;
    const components = Array.isArray(payload.components) && payload.components.length > 0 ? payload.components : DEFAULT_COMPONENTS;

    const client = getSanityClient();
    const existing = await client.getDocument<FittingConfigDoc>('fittingConfig');
    if (!existing) {
      const created = await client.create({ _id: 'fittingConfig', _type: 'fitting_config', components, updatedAt: new Date().toISOString() });
      return NextResponse.json({ success: true, data: created });
    }
    const updated = await client.patch('fittingConfig').set({ components, updatedAt: new Date().toISOString() }).commit();
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error('POST /api/fitting-config error:', e);
    return NextResponse.json({ success: false, error: 'Failed to update fitting config' }, { status: 500 });
  }
}
