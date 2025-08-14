import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { getCustomerById, getCustomerBills, subscribeToCustomerBills, getCustomerActivity } from '@/lib/customer-queries';

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
  const [customer, setCustomer] = useState<any | null>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch customer data
      const [customerData, billsData, activityData] = await Promise.all([
        getCustomerById(user.id),
        getCustomerBills(user.id),
        getCustomerActivity(user.id, 5)
      ]);

      setCustomer(customerData);
      setBills(billsData);
      setActivity(activityData);
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch customer data'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time subscription for bills
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToCustomerBills(user.id, (updatedBills) => {
      setBills(updatedBills);
      
      // Also update the activity data when bills change
      getCustomerActivity(user.id, 5).then(setActivity);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Refresh function to manually refetch all data
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    customer,
    bills,
    activity,
    loading,
    error,
    refresh
  };
};
