"use client";

import { useEffect, useRef, useState } from "react";

// The cashbook DB (oojkmj55) dataset is not publicly readable, so a browser
// Sanity `listen` client cannot subscribe (403). Instead we poll the
// token-safe server route /api/cashbook/entries and diff against the last
// snapshot to emit appear/update/disappear events with the same contract.

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

    const poll = async () => {
      try {
        const res = await fetch('/api/cashbook/entries');
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

        const prev = snapshotRef.current;

        // Deletions (present before, missing now)
        for (const id of prev.keys()) {
          if (!next.has(id)) {
            callbacksRef.current.onEntryDeleted?.(id);
          }
        }

        // Additions / updates
        for (const [id, entry] of next) {
          const prior = prev.get(id);
          if (!prior) {
            callbacksRef.current.onEntryAdded?.(entry);
          } else if (!shallowEntryEquals(prior, entry)) {
            callbacksRef.current.onEntryUpdated?.(entry);
          }
        }

        snapshotRef.current = next;
        if (active) setIsConnected(true);
      } catch (error) {
        if (active) setIsConnected(false);
        // silent — retry on next interval
      }
    };

    poll();
    timer = setInterval(poll, pollIntervalMs);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      snapshotRef.current = new Map();
    };
  }, [pollIntervalMs]);

  return {
    isConnected,
  };
}
