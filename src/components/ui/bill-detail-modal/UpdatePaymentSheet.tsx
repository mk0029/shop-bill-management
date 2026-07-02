"use client";

import { PaymentUpdateModal } from "@/components/ui/payment-update-modal";

interface UpdatePaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  currency?: string;
  onUpdatePayment: (
    billId: string,
    paymentData: {
      paymentStatus: "pending" | "partial" | "paid";
      paidAmount: number;
      balanceAmount: number;
      paymentMethod?: string;
      notes?: string;
    },
  ) => Promise<void>;
}

export function UpdatePaymentSheet(props: UpdatePaymentSheetProps) {
  return <PaymentUpdateModal {...props} />;
}
