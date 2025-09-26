'use client';

import { useState, useEffect } from 'react';
import { onlineApiService } from '@/lib/sanity-api-service';

type ShopStatus = 'offline' | 'online' | 'at_shop';

const mapStateToStatus = ({ isOnline, atShop }: { isOnline?: boolean; atShop?: boolean }): ShopStatus => {
  if (!isOnline) return 'offline';
  return atShop ? 'at_shop' : 'online';
};

export function useShopStatus() {
  const [status, setStatus] = useState<ShopStatus>('offline');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial status
  useEffect(() => {
    const loadStatus = async () => {
      try {
        setIsLoading(true);
        const result = await onlineApiService.getOnlineStatus();
        if (result.success && result.data) {
          const newStatus = mapStateToStatus({
            isOnline: result.data.isOnline,
            atShop: result.data.atShop
          });
          setStatus(newStatus);
        }
      } catch (err) {
        console.error('Error loading shop status:', err);
        setError('Failed to load shop status');
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, []);

  const updateStatus = async (newStatus: ShopStatus) => {
    try {
      setIsLoading(true);
      setError(null);
      const payload = {
        isOnline: newStatus !== 'offline',
        atShop: newStatus === 'at_shop',
        note: "",
        updatedAt: new Date().toISOString()
      };      
      const result = await onlineApiService.updateOnlineStatus(payload);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      const updatedStatus = mapStateToStatus({
        isOnline: payload.isOnline,
        atShop: payload.atShop
      });
      
      setStatus(updatedStatus);
      return updatedStatus;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      console.error('Error updating shop status:', errorMessage, err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    setStatus: updateStatus,
    isLoading,
    error,
  };
}
