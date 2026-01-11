import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocaleStore } from "@/store/locale-store";
import { formatCustomerActivity } from "@/lib/customer-utils";
import type { CustomerWithStats } from "@/types/customer";
import Link from "next/link";

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

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  const customerDetails = [
    { label: <span>Phone&nbsp; &nbsp;  &nbsp; <span className="text-xs text-yellow-400/50">click for call</span></span>, value: customer.phone },
    { label: "Location", value: customer.location },
    { label: "ID", value: customer.customerId },
    { label: "Total Bills", value: customer.totalBills.toString() },
    {
      label: "Total Spent",
      value: `${currency}${customer.totalSpent.toLocaleString()}`,
    },
    {
      label: "Pending",
      value: <span>  {formatCustomerActivity(customer, currency) === "All Paid" ? (
                <span className="text-green-500">All Paid</span>
              ) : (
                <span className="text-yellow-500">{formatCustomerActivity(customer, currency)}</span>
              )}</span>,
    },
    {
      label: "Last Bill",
      value: customer.lastBillDate ? formatDate(customer.lastBillDate) : "No bills yet",
    },
    { label: "Member Since", value: formatDate(customer.createdAt) },
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
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">{customer.name}</h3>
            {/* <p className="text-gray-400">Customer ID: {customer.clerkId}</p> */}
            {/* <p className="text-white font-bold text-base sm:text-lg mt-1">
            
            </p> */}
          </div>
        </div>

        {/* Customer Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {customerDetails.map((detail, index) => {
            const isPhone =
              typeof detail.label === "string" &&
              detail.label.toLowerCase() === "phone" &&
              !!detail.value;
            const isEmail =
              typeof detail.label === "string" &&
              detail.label.toLowerCase() === "email" &&
              !!detail.value;

            if (isPhone) {
              return (
                <Link
                  key={index}
                  href={`tel:${String(detail.value).replace(/\s+/g, "")}`}
                  className="p-3 bg-gray-800 rounded border border-gray-700 block hover:bg-gray-700/70">
                  <p className="text-sm text-gray-400">{detail.label}</p>
                  <p className="text-white">{detail.value}</p>
                </Link>
              );
            }

            if (isEmail) {
              return (
                <Link
                  key={index}
                  href={`mailto:${String(detail.value)}`}
                  className="p-3 bg-gray-800 rounded border border-gray-700 block hover:bg-gray-700/70">
                  <p className="text-sm text-gray-400">{detail.label}</p>
                  <p className="text-white">{detail.value}</p>
                </Link>
              );
            }

            return (
              <div
                key={index}
                className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">{detail.label}</p>
                <p className="text-white capitalize">{detail.value}</p>
              </div>
            );
          })}
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
