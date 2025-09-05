import { BillDetailModal as BaseBillDetailModal } from "@/components/ui/bill-detail-modal";

interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  currency: string;
  getBillStatusColor: (status: string) => string;
  getTotalAmount: (bill: any) => number;
  getServiceTypeLabel: (serviceType: string) => string;
  onDownloadBill: (bill: any) => void;
}

export const BillDetailModal = ({
  isOpen,
  onClose,
  bill,
  currency,
  getBillStatusColor,
  getTotalAmount,
  getServiceTypeLabel,
  onDownloadBill,
}: BillDetailModalProps) => {
  return (
    <BaseBillDetailModal
      isOpen={isOpen}
      onClose={onClose}
      bill={bill}
      onDownloadPDF={onDownloadBill}
      showShareButton={false}
    />
  );
};
