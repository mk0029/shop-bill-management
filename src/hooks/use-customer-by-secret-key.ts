import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  avatar?: {
    asset: {
      _ref: string;
    };
  };
  secretKey: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useCustomerBySecretKey() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user?.secretKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/customer/${user.secretKey}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch customer data');
        }

        const data = await response.json();
        setCustomer(data);
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch customer data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [user?.secretKey]);

  return { customer, loading, error };
}
