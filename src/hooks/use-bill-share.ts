import { useCallback } from 'react';
import { shareBillOnWhatsApp } from '@/lib/whatsapp-share';
import type { BillDetails } from '@/lib/whatsapp-share';

export function useBillShare() {
  const shareOnWhatsApp = useCallback(async (bill: BillDetails) => {
    try {
      await shareBillOnWhatsApp(bill);
    } catch (error) {
      console.error('Error sharing bill on WhatsApp:', error);
      // You can handle the error here, e.g., show a toast notification
    }
  }, []);

  return {
    shareOnWhatsApp
  };
}
