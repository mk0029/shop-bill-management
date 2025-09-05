"use client";

import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { Eye } from "lucide-react";

interface BillDetailTriggerProps {
  bill: any;
  buttonLabel?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: ReactNode; // Optional custom trigger element
  showShareButton?: boolean;
  showPaymentControls?: boolean;
  onDownloadPDF?: (bill: any) => void;
  onUpdatePayment?: (
    billId: string,
    data: { paymentStatus: "pending" | "partial" | "paid"; paidAmount: number; balanceAmount: number }
  ) => Promise<void>;
}

export const BillDetailTrigger = ({
  bill,
  buttonLabel = "View",
  variant = "outline",
  size = "sm",
  className,
  children,
  showShareButton = true,
  showPaymentControls = true,
  onDownloadPDF,
  onUpdatePayment,
}: BillDetailTriggerProps) => {
  const [open, setOpen] = useState(false);

  if (!bill) return null;

  const trigger = children ? (
    <div onClick={() => setOpen(true)}>{children}</div>
  ) : (
    <Button variant={variant} size={size} onClick={() => setOpen(true)} className={className}>
      <Eye className="w-4 h-4 mr-2" />
      {buttonLabel}
    </Button>
  );

  return (
    <>
      {trigger}
      <BillDetailModal
        isOpen={open}
        onClose={() => setOpen(false)}
        bill={bill}
        onDownloadPDF={onDownloadPDF}
        onUpdatePayment={onUpdatePayment}
        showShareButton={showShareButton}
        showPaymentControls={showPaymentControls}
      />
    </>
  );
};
