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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative z-[61] w-full max-w-sm mx-auto rounded-[22px] border border-white/[0.12] bg-white/[0.08] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_1px_0_rgba(255,255,255,0.1)_inset] backdrop-blur-2xl text-center">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-[50px] bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-t-[22px]" />
            <div className="mb-3">
              <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                <WifiOff className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">You are Offline</h3>
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

