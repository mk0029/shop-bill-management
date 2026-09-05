import { NextRequest, NextResponse } from 'next/server'
import { createDocument, updateDocument } from '@/lib/sanity/write-router'
import { queryDocuments, querySingleDocument } from '@/lib/sanity/read-router'

export async function GET() {
  try {
    const namesRes = await queryDocuments(
      `*[_type == "manualCashbookName"] | order(usageCount desc, lastUsedAt desc) {
        _id,
        name,
        normalizedName,
        usageCount,
        lastUsedAt,
        createdAt
      }`,
      {},
      'cashbook'
    )
    return NextResponse.json({ success: true, data: namesRes.data }, { status: 200 })
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

    const existingRes = await querySingleDocument<{ _id: string; usageCount?: number; name?: string; normalizedName?: string }>(
      `*[_type == "manualCashbookName" && normalizedName == $nn][0]`,
      { nn: normalizedName },
      'cashbook'
    )
    const existing = existingRes.data

    if (existing) {
      const updated = await updateDocument(existing._id, {
        usageCount: (existing.usageCount || 0) + 1,
        lastUsedAt: new Date().toISOString(),
      }, 'cashbook')
      return NextResponse.json({ success: true, data: { ...existing, _id: existing._id, usageCount: (existing.usageCount || 0) + 1 }, created: false }, { status: 200 })
    }

    const doc = {
      _type: 'manualCashbookName',
      name: rawName,
      normalizedName,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    const created = await createDocument(doc, 'cashbook')
    return NextResponse.json({ success: true, data: { _id: created.documentId, ...doc }, created: true }, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
