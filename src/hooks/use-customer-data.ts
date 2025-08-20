import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useCustomerBillsStore } from '@/store/customer-bills-store';

interface UseCustomerDataReturn {
  customer: any | null;
  bills: any[];
  activity: any;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useCustomerData = (): UseCustomerDataReturn => {
  const { user } = useAuthStore();
  const {
    bills,
  } = useCustomerBillsStore();
  const [customer, setCustomer] = useState<unknown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomerData = useCallback(async () => {
    console.log("🔍 fetchCustomerData called with user:", user);
    console.log("🔍 User secretKey:", user?.secretKey);

    if (!user?.secretKey) {
      console.log("❌ No user or secretKey found, not fetching customer data");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch customer data from our new API endpoint
      const response = await fetch(`/api/customer/${user.secretKey}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customer data");
      }
      const customerData = await response.json();
      console.log("✅ Customer data fetched:", customerData);
      setCustomer(customerData);

      // Don't fetch bills here - let the individual pages handle that
      // This prevents infinite loops and duplicate requests
    } catch (err) {
      console.error("Error fetching customer data:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch customer data")
      );
    } finally {
      setLoading(false);
    }
  }, [user?.secretKey]);

  // Initial data fetch
  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // Generate activity data from bills
  const activity = useMemo(() => {
    if (!bills.length) return {};

    const recentBills = [...bills]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);

    return {
      recentBills,
      totalSpent: bills
        .filter((bill) => bill.paymentStatus === "paid")
        .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
      pendingBills: bills.filter((bill) => bill.paymentStatus === "pending")
        .length,
      paidBills: bills.filter((bill) => bill.paymentStatus === "paid").length,
    };
  }, [bills]);

  // Refresh function to manually refetch all data
  const refresh = useCallback(async () => {
    await fetchCustomerData();
  }, [fetchCustomerData]);

  return {
    customer,
    bills,
    activity,
    loading: loading,
    error,
    refresh,
  };
};
