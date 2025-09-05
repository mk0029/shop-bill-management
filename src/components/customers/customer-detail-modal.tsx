import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocaleStore } from "@/store/locale-store";
import type { CustomerWithStats } from "@/types/customer";

interface CustomerDetailModalProps {
  customer: CustomerWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onViewBills?: (customer: CustomerWithStats) => void;
  onEditCustomer?: (customer: CustomerWithStats) => void;
}

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onViewBills,
  onEditCustomer,
}: CustomerDetailModalProps) {
  const { currency } = useLocaleStore();

  if (!customer) return null;

  const customerDetails = [
    { label: "Phone", value: customer.phone },
    { label: "Location", value: customer.location },
    { label: "Total Bills", value: customer.totalBills.toString() },
    {
      label: "Total Spent",
      value: `${currency}${customer.totalSpent.toLocaleString()}`,
    },
    { label: "Last Bill", value: customer.lastBillDate || "No bills yet" },
    { label: "Member Since", value: customer.createdAt },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Details" size="lg">
      <div className="space-y-6 max-md:space-y-4">
        {/* Customer Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">
              {customer.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{customer.name}</h3>
            <p className="text-gray-400">Customer ID: {customer.clerkId}</p>
          </div>
        </div>

        {/* Customer Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {customerDetails.map((detail, index) => (
            <div
              key={index}
              className="p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-sm text-gray-400">{detail.label}</p>
              <p className="text-white">{detail.value}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onViewBills && (
            <Button className="flex-1" onClick={() => onViewBills(customer)}>
              View Bills
            </Button>
          )}
          {onEditCustomer && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onEditCustomer(customer)}>
              Edit Customer
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
