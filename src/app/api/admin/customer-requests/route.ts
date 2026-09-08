import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { getSanityClient } from '@/lib/sanity/client-factory'
import { getServerAuth } from '@/lib/server-auth'

export const runtime = 'nodejs'

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status })
}

// NOTE: GROQ does not support inline object literals inside ternary expressions
// (e.g. `field == "" ? null : { ... }`), which made these queries throw a parse
// error and (after `.catch(() => [])`) return an empty list while the plain
// `count()` in /stats kept working — the source of the badge-vs-list mismatch.
// Ops docs store person/customer refs as plain string id fields, so we project the
// primitives and rebuild the object shapes in JS below.
const opsProjection = `{
      _id,
      requestId,
      name,
      phone,
      email,
      location,
      company,
      requestType,
      status,
      submittedAt,
      expiresAt,
      resolvedAt,
      rejectionReason,
      customerId,
      ipAddress,
      deviceFingerprint,
      cancelledReason,
      cancelledAt,
      cancelledBy,
      resolvedByUserId,
      rejectedByUserId,
      customerRefId,
    }`

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated) return errorResponse('Unauthorized', 401)
    if (auth.role !== 'admin' && auth.role !== 'super_admin') return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const sortField = searchParams.get('sortField') || 'submittedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const allowedSort = { submittedAt: true, name: true, email: true, status: true }
    const safeSort = allowedSort[sortField as keyof typeof allowedSort] ? sortField : 'submittedAt'
    const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc'

    const filters: string[] = []
    const params: Record<string, unknown> = {}

    if (status && status !== 'all') {
      filters.push('status == $status')
      params.status = status
    }

    if (search) {
      filters.push('(name match $search || email match $search || phone match $search || requestId match $search || coalesce(company, "") match $search)')
      params.search = `*${search}*`
    }

    if (dateFrom) {
      filters.push('submittedAt >= $dateFrom')
      params.dateFrom = dateFrom
    }
    if (dateTo) {
      filters.push('submittedAt <= $dateTo')
      params.dateTo = dateTo
    }

    const filterStr = filters.length > 0 ? `&& ${filters.join(' && ')}` : ''
    const baseQuery = `*[_type == "customerRequest" ${filterStr}]`
    const orderPrefix = safeOrder === 'asc' ? '' : '-'

    const legacyProjection = `{
      _id,
      requestId,
      name,
      phone,
      email,
      location,
      company,
      requestType,
      status,
      submittedAt,
      expiresAt,
      resolvedAt,
      rejectionReason,
      customerId,
      ipAddress,
      deviceFingerprint,
      cancelledReason,
      cancelledAt,
      cancelledBy,
      "resolvedBy": resolvedBy->{_id, name},
      "rejectedBy": rejectedBy->{_id, name},
      "customerRef": customerRef->{_id, name, customerId},
    }`

    const [legacy, ops] = await Promise.all([
      sanityClient.fetch<any[]>(`${baseQuery} | order(${orderPrefix}${safeSort}) ${legacyProjection}`, params).catch(() => []),
      getSanityClient('operations').fetch<any[]>(`${baseQuery} | order(${orderPrefix}${safeSort}) ${opsProjection}`, params).catch(() => []),
    ])

    // Rebuild object-shaped ref fields for operations rows (stored as plain string ids).
    const opsNormalized = ops.map((r) => {
      const ref = (id?: string | null) =>
        id ? { _id: id, name: null } : null
      return {
        ...r,
        _sourceDb: 'operations',
        resolvedBy: ref(r.resolvedByUserId),
        rejectedBy: ref(r.rejectedByUserId),
        customerRef: r.customerRefId
          ? { _id: r.customerRefId, name: null, customerId: r.customerId }
          : null,
        resolvedByUserId: undefined,
        rejectedByUserId: undefined,
        customerRefId: undefined,
      }
    })

    const merged = legacy
      .map((r) => ({ ...r }))
      .concat(opsNormalized)

    merged.sort((a, b) => {
      const av = a?.[safeSort]
      const bv = b?.[safeSort]
      const cmp = safeOrder === 'asc' ? String(av ?? '').localeCompare(String(bv ?? '')) : String(bv ?? '').localeCompare(String(av ?? ''))
      return cmp
    })

    const total = merged.length
    const data = merged.slice((page - 1) * pageSize, page * pageSize)

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return errorResponse(message, 500)
  }
}
