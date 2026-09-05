import { NextRequest, NextResponse } from 'next/server'
import { getSanityClient } from '@/lib/sanity/client-factory'
import { getServerAuth } from '@/lib/server-auth'
import { isAdminLike } from '@/lib/rbac'

export const runtime = 'nodejs'

const USER_FIELDS = `
  _id,
  clerkId,
  customerId,
  secretKey,
  name,
  nickname,
  email,
  phone,
  location,
  profileImage,
  role,
  isActive,
  allowedDevicesCount,
  reminderLimit,
  dueReminderRepeatDays,
  reminderIntervalDays,
  preferredChannels,
  preferredReminderTime,
  allowDueReminder,
  lastDueReminderSentAt,
  lastDueReminderAmount,
  reminderCount,
  fcmTokens,
  fcmTokensProd,
  fcmTokensDev,
  createdAt,
  updatedAt
`

// One-time migration: clone all user documents from primary into the dedicated
// users DB (CUSTOMERS -> wpzry5rh), reusing the same _id so references keep
// working. Idempotent: existing docs are overwritten with createOrReplace.
export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const onlyRoles: string[] = Array.isArray(body?.roles)
      ? body.roles.map(String)
      : []

    const primary = getSanityClient('primary')
    const customers = getSanityClient('customers')

    let where = ''
    if (onlyRoles.length) {
      where = ` && role in $roles`
    }

    const users = (await primary.fetch<any[]>(
      `*[_type == "user"${where}] { ${USER_FIELDS} }`,
      onlyRoles.length ? { roles: onlyRoles } : {}
    )) || []

    let inserted = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    for (const u of users) {
      if (!u?._id) {
        failed++
        continue
      }
      const { _id, ...rest } = u
      const doc = { _id, _type: 'user', ...rest }
      try {
        await customers.createOrReplace(doc as any)
        inserted++
      } catch (err) {
        failed++
        errors.push(`${_id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      total: users.length,
      inserted,
      failed,
      errors: errors.slice(0, 50),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error migrating users:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
