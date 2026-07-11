import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { getServerAuth } from '@/lib/server-auth'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (auth.role !== 'admin' && auth.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const pending = await sanityClient.fetch(`count(*[_type == "customerRequest" && status == "pending"])`)
    const approved = await sanityClient.fetch(`count(*[_type == "customerRequest" && status == "approved"])`)
    const rejected = await sanityClient.fetch(`count(*[_type == "customerRequest" && status == "rejected"])`)

    return NextResponse.json({
      success: true,
      data: { pending, approved, rejected },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
