import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

// Search users by name/email/phone. Returns minimal info for a dropdown.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || 20)))
    if (!q) {
      return NextResponse.json({ users: [] }, { status: 200 })
    }

    // Simple case-insensitive match using lower() contains in GROQ via match operator.
    // We'll fetch candidates and filter on server for phone normalization.
    const query = `*[_type == "user" && isActive != false && (
      lower(name) match $q || lower(email) match $q || defined(phone) || defined(phoneNumber) || defined(mobile) || defined(contactNumber)
    )]{
      _id,
      name,
      email,
      phone,
      phoneNumber,
      mobile,
      contactNumber,
      customerId,
      clerkId
    }[0...$limit]`

    const users = await sanityClient.fetch<any[]>(query, { q: `*${q.toLowerCase()}*`, limit })

    const norm = (s: string) => (s || '').replace(/\D+/g, '')
    const qDigits = norm(q)

    const mapped = (users || []).map(u => {
      const phones = [u.phone, u.phoneNumber, u.mobile, u.contactNumber].filter(Boolean)
      const phoneDigits = Array.from(new Set(phones.map((p: string) => norm(String(p))).filter(Boolean)))
      const displayPhone = phones.find(Boolean) || null
      return {
        id: u._id,
        name: u.name || u.email || u.customerId || u.clerkId || 'Unnamed',
        email: u.email || null,
        phone: displayPhone,
        phoneDigits,
        aliases: [u._id, u.customerId, u.clerkId].filter(Boolean),
      }
    })

    // If the query looks like a phone number, prioritize exact/startsWith matches in digits
    let results = mapped
    if (qDigits) {
      results = mapped.filter(u => u.phoneDigits?.some((pd: string) => pd.includes(qDigits)))
    }

    return NextResponse.json({ users: results })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
