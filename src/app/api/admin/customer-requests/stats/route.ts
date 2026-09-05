import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { getSanityClient } from '@/lib/sanity/client-factory'
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

    const countFor = async (client: any, status: string) => {
      try {
        return (await client.fetch(`count(*[_type == "customerRequest" && status == $status])`, { status })) || 0
      } catch {
        return 0
      }
    }

    const opsClient = getSanityClient('operations')
    const [pending, approved, rejected, opsPending, opsApproved, opsRejected] =
      await Promise.all([
        countFor(sanityClient, 'pending'),
        countFor(sanityClient, 'approved'),
        countFor(sanityClient, 'rejected'),
        countFor(opsClient, 'pending'),
        countFor(opsClient, 'approved'),
        countFor(opsClient, 'rejected'),
      ])

    return NextResponse.json({
      success: true,
      data: {
        pending: pending + opsPending,
        approved: approved + opsApproved,
        rejected: rejected + opsRejected,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
