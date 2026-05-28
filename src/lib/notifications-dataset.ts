import { sanityClient } from '@/lib/sanity'

export type Audience = 'admins' | 'all' | 'users'

export type PersistInput = {
  audience: Audience
  title: string
  body: string
  link?: string
  userIds?: string[]
}

export async function persistNotification(input: PersistInput) {
  // Always go through our API to apply push-first-then-save policy and mappings
  const res = await fetch('/api/notifications/persist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({ error: 'Failed to persist notification' }))
    throw new Error(j?.error || 'Failed to persist notification')
  }
  return res.json()
}

export async function listNotifications(params: { userId?: string; clerkId?: string; customerId?: string; role?: string; phone?: string; limit?: number; includeCleared?: boolean }) {
  const query = new URLSearchParams()
  if (params.userId) query.set('userId', params.userId)
  if (params.clerkId) query.set('clerkId', params.clerkId)
  if (params.customerId) query.set('customerId', params.customerId)
  if (params.role) query.set('role', params.role)
  if (params.phone) query.set('phone', params.phone)
  if (typeof params.limit === 'number') query.set('limit', String(params.limit))
  if (params.includeCleared) query.set('includeCleared', 'true')

  const res = await fetch(`/api/notifications/list?${query.toString()}`, { method: 'GET' })
  if (!res.ok) {
    const j = await res.json().catch(() => ({ error: 'Failed to list notifications' }))
    throw new Error(j?.error || 'Failed to list notifications')
  }
  return res.json() as Promise<{ items: any[] }>
}

export async function clearNotifications(input: { userId?: string; phone?: string; notificationId?: string; notificationIds?: string[] }) {
  const res = await fetch('/api/notifications/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({ error: 'Failed to clear notifications' }))
    throw new Error(j?.error || 'Failed to clear notifications')
  }
  return res.json()
}
