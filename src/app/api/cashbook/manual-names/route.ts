import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export async function GET() {
  try {
    const query = `*[_type == "manualCashbookName"] | order(usageCount desc, lastUsedAt desc) {
      _id,
      name,
      normalizedName,
      usageCount,
      lastUsedAt,
      createdAt
    }`
    const names = await sanityClient.fetch(query)
    return NextResponse.json({ success: true, data: names }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawName = String(body?.name || '').trim()
    if (!rawName) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
    }

    const normalizedName = rawName
      .replace(/\s+/g, ' ')
      .toLowerCase()

    const existing = await sanityClient.fetch(
      `*[_type == "manualCashbookName" && normalizedName == $nn][0]`,
      { nn: normalizedName }
    )

    if (existing) {
      const updated = await sanityClient
        .patch(existing._id)
        .set({
          usageCount: (existing.usageCount || 0) + 1,
          lastUsedAt: new Date().toISOString(),
        })
        .commit()
      return NextResponse.json({ success: true, data: updated, created: false }, { status: 200 })
    }

    const doc = {
      _type: 'manualCashbookName',
      name: rawName,
      normalizedName,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    const created = await sanityClient.create(doc)
    return NextResponse.json({ success: true, data: created, created: true }, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
