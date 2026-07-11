import { create } from "zustand"
import { sanityClient } from "@/lib/sanity"

export type RegistrationEventType =
  | "registration:created"
  | "registration:approved"
  | "registration:rejected"
  | "registration:cancelled"
  | "registration:expired"
  | "registration:deleted"
  | "registration:updated"

export interface RegistrationEvent {
  type: RegistrationEventType
  requestId: string
  timestamp: number
}

interface RegistrationRequestStore {
  pendingCount: number
  lastEvent: RegistrationEvent | null
  listenerActive: boolean
  setPendingCount: (count: number) => void
  setLastEvent: (event: RegistrationEvent) => void
}

export const useRegistrationRequestStore = create<RegistrationRequestStore>((set) => ({
  pendingCount: 0,
  lastEvent: null,
  listenerActive: false,
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastEvent: (event) => set({ lastEvent: event }),
}))

let listenerInitialized = false
let listenerSubscription: { unsubscribe: () => void } | null = null

export function initializeRegistrationListener() {
  if (listenerInitialized) return
  listenerInitialized = true

  const loadCount = async () => {
    try {
      const res = await fetch("/api/admin/customer-requests/stats", { cache: "no-store" })
      const json = await res.json()
      if (json?.success) {
        const prev = useRegistrationRequestStore.getState().pendingCount
        const next = json.data?.pending ?? 0
        useRegistrationRequestStore.getState().setPendingCount(next)
        if (next > prev && prev !== 0) {
          useRegistrationRequestStore.getState().setLastEvent({
            type: "registration:created",
            requestId: "batch",
            timestamp: Date.now(),
          })
        }
      }
    } catch { /* ignore */ }
  }

  void loadCount()

  listenerSubscription = sanityClient
    .listen('*[_type == "customerRequest"]', {}, { includeResult: false })
    .subscribe(() => void loadCount())
}

export function destroyRegistrationListener() {
  if (listenerSubscription) {
    listenerSubscription.unsubscribe()
    listenerSubscription = null
  }
  listenerInitialized = false
}
