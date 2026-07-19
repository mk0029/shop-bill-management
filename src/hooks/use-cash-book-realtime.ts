"use client";

import { useEffect, useRef, useState } from "react";
import { sanityClient } from "@/lib/sanity";

export interface CashBookEntry {
  _id: string;
  _createdAt: string;
  user?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  userName: string;
  amount: number;
  type: 'credit' | 'debit';
  source: 'Manual' | 'Bill Payment';
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
}

export function useCashBookRealtime({
  onEntryAdded,
  onEntryUpdated,
  onEntryDeleted,
}: UseCashBookRealtimeProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      try {
        // Listen to cash book entry changes
        const query = `*[_type == "cashBookEntry"]`;
        const params = {};
        
        subscriptionRef.current = sanityClient
          .listen(query, params, { includeResult: true })
          .subscribe({
            next: (update: any) => {
              const { transition, result, documentId } = update;
              
              if (!result && transition !== "disappear") return;

              switch (transition) {
                case "appear":
                case "update":
                  // Entry created or updated
                  const entry = result as CashBookEntry;
                  if (transition === "appear") {
                    onEntryAdded?.(entry);
                  } else {
                    onEntryUpdated?.(entry);
                  }
                  break;
                case "disappear":
                  // Entry deleted
                  onEntryDeleted?.(documentId);
                  break;
              }
            },
            error: (error: any) => {
              console.warn('[realtime] cash-book subscription error:', error instanceof Error ? error.message : error);
              setIsConnected(false);
            },
            complete: () => {
              setIsConnected(false);
            },
          });

        setIsConnected(true);

      } catch (error) {
        console.warn('[realtime] cash-book setup error:', error instanceof Error ? error.message : error);
        setIsConnected(false);
      }
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      try {
      } catch {}
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [onEntryAdded, onEntryUpdated, onEntryDeleted]);

  return {
    isConnected,
  };
}
