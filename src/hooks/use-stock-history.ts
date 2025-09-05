/**
 * Custom hook for managing stock history data
 */

import { useState, useEffect, useCallback } from "react";
import {
  stockHistoryApi,
  StockHistoryFilters,
  StockHistorySummary,
  HistoryTransaction,
} from "@/lib/stock-history-api";

export interface UseStockHistoryReturn {
  transactions: HistoryTransaction[];
  summary: StockHistorySummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchWithFilters: (filters: StockHistoryFilters) => Promise<void>;
}

export const useStockHistory = (
  initialFilters?: StockHistoryFilters
): UseStockHistoryReturn => {
  const [transactions, setTransactions] = useState<HistoryTransaction[]>([]);
  const [summary, setSummary] = useState<StockHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (filters?: StockHistoryFilters) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch transactions and summary in parallel
      const [transactionsResult, summaryResult] = await Promise.all([
        stockHistoryApi.getStockTransactions(filters),
        stockHistoryApi.getStockHistorySummary(filters),
      ]);

      if (transactionsResult.success) {
        setTransactions(transactionsResult.data || []);
      } else {
        setError(transactionsResult.error || "Failed to fetch transactions");
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(
    () => fetchData(initialFilters),
    [fetchData, initialFilters]
  );

  const fetchWithFilters = useCallback(
    (filters: StockHistoryFilters) => fetchData(filters),
    [fetchData]
  );

  // Initial fetch
  useEffect(() => {
    fetchData(initialFilters);
  }, [fetchData, initialFilters]);

  return {
    transactions,
    summary,
    loading,
    error,
    refetch,
    fetchWithFilters,
  };
};
