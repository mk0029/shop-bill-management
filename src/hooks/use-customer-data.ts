import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useSanityBillStore } from '@/store/sanity-bill-store';

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
  const { fetchBillsByCustomer, bills, loading: billsLoading } = useSanityBillStore();
  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomerData = useCallback(async () => {
    if (!user?.secretKey) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch customer data from our new API endpoint
      const response = await fetch(`/api/customer/${user.secretKey}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      const customerData = await response.json();
      setCustomer(customerData);

      // Fetch customer's bills
      if (customerData?._id) {
        await fetchBillsByCustomer(customerData._id);
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch customer data'));
    } finally {
      setLoading(false);
    }
  }, [user?.secretKey, fetchBillsByCustomer]);

  // Initial data fetch
  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // Generate activity data from bills
  const activity = useMemo(() => {
    if (!bills.length) return {};
    
    const recentBills = [...bills]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    return {
      recentBills,
      totalSpent: bills
        .filter(bill => bill.paymentStatus === 'paid')
        .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
      pendingBills: bills.filter(bill => bill.paymentStatus === 'pending').length,
      paidBills: bills.filter(bill => bill.paymentStatus === 'paid').length,
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
    loading: loading || billsLoading,
    error,
    refresh
  };
};
