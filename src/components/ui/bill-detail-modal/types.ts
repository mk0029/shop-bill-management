export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  role?: "admin" | "customer";
  onDownloadPDF?: (bill: any) => void;
  onPayOnline?: (bill: any) => void;
  onUpdatePayment?: (
    billId: string,
    paymentData: {
      paymentStatus: "pending" | "partial" | "paid";
      paidAmount: number;
      balanceAmount: number;
      discount?: number;
    },
  ) => Promise<void>;
  onEditBill?: (bill: any) => void;
  showShareButton?: boolean;
}

export interface ActivityEntry {
  id: string;
  action: string;
  timestamp: string;
  user?: string;
  type?: "created" | "assigned" | "updated" | "payment" | "reminder" | "completed";
}
