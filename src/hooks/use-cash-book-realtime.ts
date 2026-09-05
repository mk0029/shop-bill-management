"use client";

import { useEffect, useRef, useState } from "react";

// The cashbook DB (oojkmj55) is not publicly readable, so a browser Sanity
// `listen` client cannot subscribe (403). Instead of polling every few seconds,
// we subscribe once via a server-side SSE stream (GET /api/cashbook/entries/live)
// which holds a token-backed `listen` on the new cashbook DB. The old poll is
// kept strictly as a fallback if the stream cannot be established.

export interface CashBookEntry {
  _id: string;
  _createdAt: string;
  user?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  userName?: string;
  amount: number;
  totalAmount?: number;
  pendingAmount?: number;
  receivedAmount?: number;
  type: 'credit' | 'debit';
  source: 'Manual' | 'Bill Payment';
  customerName?: string;
  customerId?: string | null;
  isCustomName?: boolean;
  status?: 'completed' | 'partial';
  createdBy?: string;
  bill?: {
    _id: string;
    billNumber: string;
    customer?: {
      _id: string;
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CashBookSummary {
  totalCredits: number;
  totalDebits: number;
  balance: number;
}

interface UseCashBookRealtimeProps {
  onEntryAdded?: (entry: CashBookEntry) => void;
  onEntryUpdated?: (entry: CashBookEntry) => void;
  onEntryDeleted?: (entryId: string) => void;
  pollIntervalMs?: number;
}

const DEFAULT_POLL_MS = 8000;
const STREAM_OPEN_TIMEOUT_MS = 5000;
const LIVE_ROUTE = '/api/cashbook/entries/live';
const ENTRIES_ROUTE = '/api/cashbook/entries';

function shallowEntryEquals(a: CashBookEntry, b: CashBookEntry): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function useCashBookRealtime({
  onEntryAdded,
  onEntryUpdated,
  onEntryDeleted,
  pollIntervalMs = DEFAULT_POLL_MS,
}: UseCashBookRealtimeProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const snapshotRef = useRef<Map<string, CashBookEntry>>(new Map());
  const callbacksRef = useRef({ onEntryAdded, onEntryUpdated, onEntryDeleted });
  callbacksRef.current = { onEntryAdded, onEntryUpdated, onEntryDeleted };

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    let openTimer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let pollMode = false;

    const applyDiff = (next: Map<string, CashBookEntry>) => {
      const prev = snapshotRef.current;

      for (const id of prev.keys()) {
        if (!next.has(id)) {
          callbacksRef.current.onEntryDeleted?.(id);
        }
      }

      for (const [id, entry] of next) {
        const prior = prev.get(id);
        if (!prior) {
          callbacksRef.current.onEntryAdded?.(entry);
        } else if (!shallowEntryEquals(prior, entry)) {
          callbacksRef.current.onEntryUpdated?.(entry);
        }
      }

      snapshotRef.current = next;
    };

    const poll = async () => {
      try {
        const res = await fetch(ENTRIES_ROUTE);
        const json = await res.json().catch(() => ({ success: false }));
        if (!res.ok || !json?.success) {
          if (active) setIsConnected(false);
          return;
        }
        const rows: CashBookEntry[] = Array.isArray(json?.data) ? json.data : [];
        const next = new Map<string, CashBookEntry>();
        for (const row of rows) {
          if (row && row._id) next.set(row._id, row);
        }
        applyDiff(next);
        if (active) setIsConnected(true);
      } catch (error) {
        if (active) setIsConnected(false);
        // silent — retry on next interval
      }
    };

    const startPolling = () => {
      if (!active || pollMode) return;
      pollMode = true;
      if (es) {
        es.close();
        es = null;
      }
      if (openTimer) clearTimeout(openTimer);
      void poll();
      timer = setInterval(poll, pollIntervalMs);
    };

    const handleStreamEntry = (type: 'added' | 'updated' | 'deleted', data: any) => {
      if (!data || typeof data !== 'object') return;
      const next = new Map(snapshotRef.current);
      if (type === 'deleted') {
        if (next.delete(data._id)) {
          snapshotRef.current = next;
          callbacksRef.current.onEntryDeleted?.(data._id);
        }
        return;
      }
      if (!data._id) return;
      const prior = next.get(data._id);
      next.set(data._id, data as CashBookEntry);
      const updated = new Map(next);
      // Only emit when the entry actually changed relative to our snapshot.
      if (!prior) {
        snapshotRef.current = updated;
        callbacksRef.current.onEntryAdded?.(data);
      } else if (!shallowEntryEquals(prior, data)) {
        snapshotRef.current = updated;
        callbacksRef.current.onEntryUpdated?.(data);
      }
    };

    // Seed the snapshot once so stream diffs are correct.
    const seed = async () => {
      try {
        const res = await fetch(ENTRIES_ROUTE);
        const json = await res.json().catch(() => ({ success: false }));
        if (active && json?.success) {
          const rows: CashBookEntry[] = Array.isArray(json?.data) ? json.data : [];
          const next = new Map<string, CashBookEntry>();
          for (const row of rows) {
            if (row && row._id) next.set(row._id, row);
          }
          snapshotRef.current = next;
        }
      } catch {
        // stream/poll will surface connectivity
      }
    };

    // Primary: one server-side subscription (SSE) on the new cashbook DB.
    try {
      es = new EventSource(LIVE_ROUTE);
      es.addEventListener('open', () => {
        if (active) setIsConnected(true);
      });
      es.addEventListener('added', (e) => handleStreamEntry('added', e.data ? JSON.parse(e.data) : null));
      es.addEventListener('updated', (e) => handleStreamEntry('updated', e.data ? JSON.parse(e.data) : null));
      es.addEventListener('deleted', (e) => handleStreamEntry('deleted', e.data ? JSON.parse(e.data) : null));
      es.addEventListener('error', () => {
        if (!active) return;
        // EventSource reconnects on its own; only fall back to polling when
        // the stream proves unusable (never opened).
        if (es && es.readyState === EventSource.CLOSED) {
          setIsConnected(false);
          startPolling();
        }
      });
      openTimer = setTimeout(() => {
        if (active && es && es.readyState !== EventSource.OPEN) {
          startPolling();
        }
      }, STREAM_OPEN_TIMEOUT_MS);
    } catch {
      startPolling();
    }

    void seed();

    return () => {
      active = false;
      if (es) es.close();
      if (openTimer) clearTimeout(openTimer);
      if (timer) clearInterval(timer);
      snapshotRef.current = new Map();
    };
  }, [pollIntervalMs]);

  return {
    isConnected,
  };
}