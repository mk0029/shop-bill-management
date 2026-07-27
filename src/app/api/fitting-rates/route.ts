import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

// Sanity client factory
const getSanityClient = () => {
  const projectId = process.env.SANITY_PROJECT_ID || 'idji8ni7';
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'live-shop';
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;

  if (!token) {
    console.error('Sanity API token is not configured');
    throw new Error('Server configuration error');
  }

  return createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion: '2024-01-01',
    perspective: 'published',
  });
};

// Types
export type FittingCategory = 'underground' | 'open_pvc' | 'open_wire';

export interface FittingRatesDoc {
  _id: 'fittingRates';
  _type: 'fitting_rates';
  rates: {
    underground: number; // Underground / Wall Fitting
    open_pvc: number;    // Open Type (PVC Casing)
    open_wire: number;   // Open Wire (Wire Clamp)
  };
  updatedAt: string;
}

const DEFAULT_RATES: FittingRatesDoc['rates'] = {
  underground: 125,
  open_pvc: 70,
  open_wire: 50,
};

export async function GET() {
  try {
    const client = getSanityClient();
    const doc = await client.getDocument<FittingRatesDoc>('fittingRates');

    if (!doc) {
      // Initialize with defaults on first GET so the UI always has values
      const created = await client.create({
        _id: 'fittingRates',
        _type: 'fitting_rates',
        rates: DEFAULT_RATES,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, data: created });
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error('GET /api/fitting-rates error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fitting rates' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Admin-only via custom header role
    const roleHeader = (req.headers.get('x-user-role') || '').toLowerCase();
    if (roleHeader !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const client = getSanityClient();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const payload = (body ?? {}) as Partial<{ underground: number; open_pvc: number; open_wire: number }>;

    const nextRates: FittingRatesDoc['rates'] = {
      underground: typeof payload.underground === 'number' ? payload.underground : DEFAULT_RATES.underground,
      open_pvc: typeof payload.open_pvc === 'number' ? payload.open_pvc : DEFAULT_RATES.open_pvc,
      open_wire: typeof payload.open_wire === 'number' ? payload.open_wire : DEFAULT_RATES.open_wire,
    };

    const existing = await client.getDocument<FittingRatesDoc>('fittingRates');
    if (!existing) {
      const created = await client.create({
        _id: 'fittingRates',
        _type: 'fitting_rates',
        rates: nextRates,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, data: created });
    } else {
      const updated = await client
        .patch('fittingRates')
        .set({
          rates: nextRates,
          updatedAt: new Date().toISOString(),
        })
        .commit();
      return NextResponse.json({ success: true, data: updated });
    }
  } catch (error) {
    console.error('POST /api/fitting-rates error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update fitting rates' }, { status: 500 });
  }
}
