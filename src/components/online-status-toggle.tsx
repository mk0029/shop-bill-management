'use client';

import { Wifi, WifiOff, Store } from 'lucide-react';
import { SwitchToggle } from '@/components/ui/switch-toggle';
import { useShopStatus } from '@/hooks/use-shop-status';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function OnlineStatusToggle() {
  const { status, setStatus, isLoading, error } = useShopStatus();
  const [isUpdating, setIsUpdating] = useState(false);
  // Skip overlay until refresh
  const [overlaySkipped, setOverlaySkipped] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleStatusChange = async (value: string) => {
    try {
      setIsUpdating(true);
      await setStatus(value as 'offline' | 'online' | 'at_shop');
      toast.success(`Status updated to ${formatStatusLabel(value)}`);
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatStatusLabel = (status: string) => {
    if (status === 'online') return 'Available';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const steps = [
    {
      value: 'offline',
      label: 'Offline',
      icon: WifiOff,
    },
    {
      value: 'online',
      label: 'Available',
      icon: Wifi,
    },
    {
      value: 'at_shop',
      label: 'At Shop',
      icon: Store,
    },
  ];

  // Determine the appropriate color based on status
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'at_shop':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Shop Status</span>
        <div className="flex items-center">
          <span className="text-xs text-muted-foreground mr-2">
            {formatStatusLabel(status)}
          </span>
          <span 
            className={`w-2 h-2 rounded-full ${getStatusColor()} ${isLoading || isUpdating ? 'animate-pulse' : ''}`}
            title={isLoading ? 'Loading...' : isUpdating ? 'Updating...' : formatStatusLabel(status)}
          />
        </div>
      </div>
      <SwitchToggle
        steps={steps}
        value={status}
        onValueChange={handleStatusChange}
        trackClassName="bg-gray-100 dark:bg-gray-800"
        thumbClassName="bg-primary text-primary-foreground"
        labelClassName="text-xs font-medium"
        disabled={isLoading || isUpdating}
      />
      {(isLoading || isUpdating) && (
        <div className="text-xs text-muted-foreground mt-1 text-center">
          {isUpdating ? 'Updating...' : 'Loading...'}
        </div>
      )}

      {/* Full-screen overlay when Offline (with Skip) */}
      {!isLoading && !isUpdating && status === 'offline' && !overlaySkipped && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />
          {/* Panel */}
          <div className="relative z-[61] w-full max-w-sm mx-auto rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-xl text-center">
            <div className="mb-3">
              <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                <WifiOff className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold">You are Offline</h3>
              <p className="text-sm text-gray-400 mt-1">Switch your status to continue.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button
                variant="default"
                onClick={() => handleStatusChange('online')}
                className="w-full"
              >
                Available
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleStatusChange('at_shop')}
                className="w-full"
              >
                At Shop
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => setOverlaySkipped(true)}
              className="w-full mt-3 text-gray-300"
            >
              Skip for now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

