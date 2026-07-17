'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { NotificationDebug } from '@/components/fcm/notification-debug'
import { FcmTokenButton } from '@/components/fcm/fcm-token-button'
import { NotificationReset } from '@/components/fcm/notification-reset'
import { FcmTestSend } from '@/components/admin/fcm-test-send'
import { AdminNotificationDebug } from '@/components/admin/admin-notification-debug'
import NotificationBroadcastModal from '@/components/notifications/NotificationBroadcastModal'
import {
  getTrackedNotifications,
  loadTrackedNotifications,
  clearTrackedNotifications,
  onTrackedNotificationsChange,
  type TrackEntry,
} from '@/lib/notification-tracker'

type Tab = 'wa' | 'fcm' | 'tracker'
type TrackerFilter = 'all' | 'fcm' | 'whatsapp'
type TraceStep = { step: string; ts: string; [k: string]: any }
type User = { id: string; name: string; email: string | null; phone: string | null; role: string }

const WA_EVENTS = [
  'billing.created', 'billing.updated', 'billing.deleted',
  'billing.payment.partial', 'billing.payment.paid', 'billing.payment.updated', 'billing.payment.removed',
  'billing.multiPaid', 'billing.bulkPaid',
  'toolRent.created', 'toolRent.updated', 'toolRent.paid', 'toolRent.overdue', 'toolRent.returned',
  'workTask.created', 'workTask.updated', 'workTask.completed', 'workTask.cancelled', 'workTask.hold',
  'customer.created',
  'scheduled.goodMorning', 'scheduled.festivalGreeting',
]

const ROLE_BADGES: Record<string, string> = {
  customer: 'bg-blue-900 text-blue-300',
  admin: 'bg-amber-900 text-amber-300',
  super_admin: 'bg-red-900 text-red-300',
  technician: 'bg-purple-900 text-purple-300',
}

const CHANNEL_COLORS: Record<string, string> = {
  fcm: 'text-blue-400',
  whatsapp: 'text-green-400',
  socket: 'text-purple-400',
}

function TraceView({ trace }: { trace: TraceStep[] }) {
  if (!trace?.length) return null
  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trace ({trace.length} steps)</div>
      {trace.map((step, i) => (
        <div key={i} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 font-mono text-xs font-bold">{i + 1}. {step.step}</span>
            <span className="text-gray-600 text-xs ml-auto">{step.ts?.split('T')[1]?.split('.')[0]}</span>
          </div>
          <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto">
            {JSON.stringify(Object.fromEntries(Object.entries(step).filter(([k]) => k !== 'step' && k !== 'ts')), null, 2)}
          </pre>
        </div>
      ))}
    </div>
  )
}

function HealthBadge({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return <span className="text-gray-500 text-xs">Not checked</span>
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
      {label}
    </span>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${y}-${mo}-${da} ${h}:${mi}:${s}.${ms}`
}

function NotificationTrackerPanel() {
  const [entries, setEntries] = useState<TrackEntry[]>([])
  const [filter, setFilter] = useState<TrackerFilter>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [source, setSource] = useState<'local' | 'sanity'>('local')
  const [syncing, setSyncing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (source === 'sanity') {
      setSyncing(true)
      const data = await loadTrackedNotifications({ channel: filter === 'all' ? undefined : filter as any, count: 200, fromSanity: true })
      setEntries(data)
      setSyncing(false)
    } else {
      const all = getTrackedNotifications({ count: 200 })
      setEntries(all)
    }
  }, [source, filter])

  useEffect(() => {
    refresh()
    const unsub = onTrackedNotificationsChange(() => {
      if (source === 'local') refresh()
    })
    return unsub
  }, [refresh, source])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 2000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, refresh])

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.channel === filter)
  const stats = {
    total: entries.length,
    fcm: entries.filter((e) => e.channel === 'fcm').length,
    whatsapp: entries.filter((e) => e.channel === 'whatsapp').length,
    sent: entries.filter((e) => e.ok && !e.skipped).length,
    failed: entries.filter((e) => !e.ok).length,
    skipped: entries.filter((e) => e.skipped).length,
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-400">{stats.fcm}</div>
          <div className="text-xs text-gray-400">FCM</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-400">{stats.whatsapp}</div>
          <div className="text-xs text-gray-400">WhatsApp</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-400">{stats.sent}</div>
          <div className="text-xs text-gray-400">Sent</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-400">{stats.failed}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-400">{stats.skipped}</div>
          <div className="text-xs text-gray-400">Skipped</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(['all', 'fcm', 'whatsapp'] as TrackerFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {f === 'all' ? 'All' : f === 'fcm' ? 'FCM' : 'WhatsApp'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setSource('local')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${source === 'local' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Local
          </button>
          <button
            onClick={() => setSource('sanity')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${source === 'sanity' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Sanity
          </button>
        </div>
        {syncing && <span className="text-xs text-purple-400 animate-pulse">Syncing...</span>}
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${autoRefresh ? 'bg-green-900 text-green-300 border border-green-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
        >
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </button>
        <button onClick={refresh} className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700">
          Refresh
        </button>
        <button
          onClick={() => { clearTrackedNotifications(); refresh() }}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-900 text-red-300 border border-red-700 hover:bg-red-800"
        >
          Clear All
        </button>
      </div>

      {/* Log entries */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No notifications tracked yet. Send a WA or FCM notification to see it here.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                <tr className="text-left text-gray-400">
                  <th className="px-3 py-2 font-medium">Sync</th>
                  <th className="px-3 py-2 font-medium">Timestamp</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2">
                      {source === 'sanity' ? (
                        <span className="text-green-400">&#10003;</span>
                      ) : entry.synced ? (
                        <span className="text-green-400" title="Synced to Sanity">&#10003;</span>
                      ) : (
                        <span className="text-gray-600" title="Local only">&#8226;</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300 whitespace-nowrap">{formatTimestamp(entry.ts)}</td>
                    <td className="px-3 py-2">
                      <span className={`font-medium uppercase ${CHANNEL_COLORS[entry.channel] || 'text-gray-400'}`}>
                        {entry.channel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-300 max-w-[200px] truncate">{entry.eventType}</td>
                    <td className="px-3 py-2">
                      {entry.skipped ? (
                        <span className="text-yellow-400 font-medium">skipped</span>
                      ) : entry.ok ? (
                        <span className="text-green-400 font-medium">sent</span>
                      ) : (
                        <span className="text-red-400 font-medium">failed</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400 font-mono">{entry.durationMs != null ? `${entry.durationMs}ms` : '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{entry.target || '-'}</td>
                    <td className="px-3 py-2 text-red-400 max-w-[200px] truncate">{entry.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export function TestingGroundClient() {
  const [tab, setTab] = useState<Tab>('tracker')
  const [phone, setPhone] = useState('')
  const [waEvent, setWaEvent] = useState('billing.created')
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [healthWA, setHealthWA] = useState<any>(null)
  const [healthFCM, setHealthFCM] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [trace, setTrace] = useState<TraceStep[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Array<{ ts: string; channel: string; event: string; ok: boolean; target?: string }>>([])
  const [composerOpen, setComposerOpen] = useState(false)

  const [users, setUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    try { const res = await fetch('/api/super/testing-ground'); setConfig(await res.json()) } catch {}
  }

  const loadUsers = useCallback(async (role: string) => {
    setLoadingUsers(true)
    try {
      const res = await fetch(`/api/super/testing-ground?users=true&role=${role}`)
      const json = await res.json()
      setUsers(json.users || [])
    } catch { setUsers([]) }
    setLoadingUsers(false)
  }, [])

  useEffect(() => { loadUsers(userRoleFilter) }, [userRoleFilter, loadUsers])

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true
    const q = userSearch.toLowerCase()
    return u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone || '').includes(q)
  })

  const checkHealth = async (service: 'wa' | 'fcm') => {
    try {
      const res = await fetch(`/api/super/testing-ground?service=${service}`)
      const json = await res.json()
      if (service === 'wa') setHealthWA(json); else setHealthFCM(json)
    } catch {}
  }

  const sendWA = async () => {
    if (!phone) return setError('Enter phone number')
    setLoading(true); setResult(null); setTrace(null); setError(null)
    try {
      const res = await fetch('/api/super/testing-ground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'wa', eventType: waEvent,
          payload: {
            phone: phone.replace(/\D/g, ''), customerPhone: phone.replace(/\D/g, ''),
            customerName: selectedUser?.name || 'Test Customer',
            customerNickname: selectedUser?.name?.split(' ')[0] || 'Test',
            customerId: selectedUser?.id || 'test',
            grandTotal: 1500, totalPaid: 500, balanceAmount: 1000,
            totalAmount: 1500, paidAmount: 500,
            billNumber: 'TEST-' + Date.now().toString(36).toUpperCase(),
            paymentStatus: 'partial',
          },
        }),
      })
      const json = await res.json()
      if (json.trace) setTrace(json.trace)
      if (json.error) setError(json.error)
      setResult(json)
      setHistory(h => [{ ts: new Date().toISOString(), channel: 'WA', event: waEvent, ok: json.ok, target: phone.slice(0, 4) + '****' }, ...h].slice(0, 20))
    } catch (err: any) { setError(err.message) }
    setLoading(false)
  }

  const waOk = config?.wa?.hasSecret && config?.wa?.backendUrl !== 'NOT SET'
  const fcmOk = config?.fcm?.hasFirebase

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Testing Ground</h1>
        <p className="text-sm text-gray-400 mt-1">Track all FCM and WhatsApp notifications with exact timestamps</p>
      </div>

      {/* Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">WhatsApp Bot</span>
            <HealthBadge ok={healthWA?.ok ?? null} label={healthWA?.ok ? 'Connected' : 'Down'} />
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>URL: <span className={waOk ? 'text-green-400' : 'text-red-400'}>{config?.wa?.backendUrl || '...'}</span></div>
            <div>Secret: <span className={config?.wa?.hasSecret ? 'text-green-400' : 'text-red-400'}>{config?.wa?.hasSecret ? 'SET' : 'MISSING'}</span></div>
          </div>
          <button onClick={() => checkHealth('wa')} className="mt-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded">Check Health</button>
          {healthWA?.response?.botState && <div className="text-xs text-green-400 mt-1">Bot: {healthWA.response.botState} | Queue: {healthWA.response.queueSize || 0}</div>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Firebase Cloud Messaging</span>
            <HealthBadge ok={healthFCM?.ok ?? null} label={healthFCM?.ok ? 'Auth OK' : 'Not Authed'} />
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Firebase: <span className={fcmOk ? 'text-green-400' : 'text-red-400'}>{config?.fcm?.hasFirebase ? 'CONFIGURED' : 'MISSING'}</span></div>
            <div>Project: <span className="text-gray-300">{config?.fcm?.projectId || '...'}</span></div>
          </div>
          <button onClick={() => checkHealth('fcm')} className="mt-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded">Check Auth</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
        <button onClick={() => { setTab('tracker'); setResult(null); setTrace(null); setError(null) }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'tracker' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Tracker</button>
        <button onClick={() => { setTab('wa'); setResult(null); setTrace(null); setError(null) }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'wa' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>WhatsApp</button>
        <button onClick={() => { setTab('fcm'); setResult(null); setTrace(null); setError(null) }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'fcm' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>FCM Push</button>
      </div>

      {/* Tracker Panel */}
      {tab === 'tracker' && <NotificationTrackerPanel />}

      {/* WA Panel */}
      {tab === 'wa' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" className="w-full bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Event Type</label>
            <select value={waEvent} onChange={e => setWaEvent(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500">
              <optgroup label="Billing">
                {WA_EVENTS.filter(e => e.startsWith('billing')).map(e => <option key={e} value={e}>{e}</option>)}
              </optgroup>
              <optgroup label="Tool Rental">
                {WA_EVENTS.filter(e => e.startsWith('toolRent')).map(e => <option key={e} value={e}>{e}</option>)}
              </optgroup>
              <optgroup label="Work Tasks">
                {WA_EVENTS.filter(e => e.startsWith('workTask')).map(e => <option key={e} value={e}>{e}</option>)}
              </optgroup>
              <optgroup label="Other">
                {WA_EVENTS.filter(e => !e.startsWith('billing') && !e.startsWith('toolRent') && !e.startsWith('workTask')).map(e => <option key={e} value={e}>{e}</option>)}
              </optgroup>
            </select>
          </div>
          <button onClick={sendWA} disabled={loading} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-md text-sm transition-colors">
            {loading ? 'Sending...' : `Send ${waEvent} via WhatsApp`}
          </button>
        </div>
      )}

      {/* FCM Panel */}
      {tab === 'fcm' && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <button onClick={() => setComposerOpen(true)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-md text-sm transition-colors">
              Compose & Send Notification
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NotificationDebug />
            <FcmTestSend />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminNotificationDebug />
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">This Device Token</h3>
                <FcmTokenButton />
              </div>
              <NotificationReset />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg p-4 text-sm"><span className="font-bold">Error:</span> {error}</div>}

      {/* Result */}
      {result && !error && (
        <div className={`rounded-lg p-4 text-sm ${result.ok ? 'bg-green-950 border border-green-800 text-green-300' : 'bg-red-950 border border-red-800 text-red-300'}`}>
          <span className="font-bold">{result.ok ? 'Success' : 'Failed'}</span>
          {result.response && <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto opacity-80">{JSON.stringify(result.response, null, 2)}</pre>}
        </div>
      )}

      {trace && <TraceView trace={trace} />}

      {/* Broadcast Modal */}
      <NotificationBroadcastModal open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  )
}
