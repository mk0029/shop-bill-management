import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Minimal preferences endpoint used by the service worker (public/sw.js)
// Currently returns static defaults. You can later wire this to user-specific
// settings (e.g., from Sanity) based on auth.
export async function GET(_req: NextRequest) {
  try {
    const prefs = {
      enabled: true,
      // Empty array means "all types allowed" by our SW logic
      types: [] as string[],
    }
    return NextResponse.json(prefs, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
