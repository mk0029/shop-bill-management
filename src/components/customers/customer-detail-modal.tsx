import { useState } from "react";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { Button } from "@/components/ui/button";
import { useLocaleStore } from "@/store/locale-store";
import { formatCustomerActivity } from "@/lib/customer-utils";
import type { CustomerWithStats } from "@/types/customer";
import Link from "next/link";
import { safeInitial, safeUserName } from "@/lib/display-text";
import { Phone, MapPin, Receipt, Calendar, CreditCard, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CustomerDetailModalProps {
  customer: CustomerWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onViewBills?: (customer: CustomerWithStats) => void;
  onEditCustomer?: (customer: CustomerWithStats) => void;
}

const accentGradients = [
  "from-blue-600 to-blue-400",
  "from-emerald-600 to-emerald-400",
  "from-purple-600 to-purple-400",
  "from-amber-600 to-amber-400",
];

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onViewBills,
  onEditCustomer,
}: CustomerDetailModalProps) {
  const { currency } = useLocaleStore();
  const [copied, setCopied] = useState(false);

  if (!customer) return null;
  const customerDisplayName = safeUserName(customer.name, "Customer");
  const gradient = accentGradients[customer.totalBills % accentGradients.length];

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

  const activity = formatCustomerActivity(customer, currency);
  const isAllPaid = activity === "All Paid";

  const secretKey = (customer as any).secretKey;
  const loginUrl = secretKey && customer.phone
    ? `https://jambh-ell.vercel.app/login?phone=${encodeURIComponent(customer.phone.replace(/\s+/g, ""))}&passKey=${encodeURIComponent(secretKey)}`
    : null;

  const handleCopyLoginUrl = async () => {
    if (!loginUrl) return;
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      toast.success("Login URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const detailItems = [
    {
      icon: Phone,
      label: "Phone",
      value: customer.phone,
      href: `tel:${customer.phone.replace(/\s+/g, "")}`,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: MapPin,
      label: "Location",
      value: customer.location,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Receipt,
      label: "Total Bills",
      value: customer.totalBills.toString(),
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      icon: CreditCard,
      label: "Total Spent",
      value: `${currency}${customer.totalSpent.toLocaleString()}`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: CreditCard,
      label: "Pending",
      value: isAllPaid ? (
        <span className="text-emerald-400">All Paid</span>
      ) : (
        <span className="text-amber-400">{activity}</span>
      ),
      color: isAllPaid ? "text-emerald-400" : "text-amber-400",
      bg: isAllPaid ? "bg-emerald-500/10" : "bg-amber-500/10",
    },
    {
      icon: Calendar,
      label: "Last Bill",
      value: customer.lastBillDate
        ? formatDate(customer.lastBillDate)
        : "No bills yet",
      color: "text-gray-400",
      bg: "bg-gray-500/10",
    },
    {
      icon: Calendar,
      label: "Member Since",
      value: formatDate(customer.createdAt),
      color: "text-gray-400",
      bg: "bg-gray-500/10",
    },
  ];

  return (
    <BaseGlassModal isOpen={isOpen} onClose={onClose} title="Customer Details" size="lg" mobileType="modal" zIndex={220}>
      <div className="space-y-6">
        {/* Header with gradient avatar */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-xl shrink-0`}>
            <span className="text-white font-bold text-xl">
              {safeInitial(customer.name)}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-white truncate">
              {customerDisplayName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                customer.isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-gray-500/10 text-gray-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${customer.isActive ? "bg-emerald-400" : "bg-gray-400"}`} />
                {customer.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {detailItems.map((item, index) => {
            const Icon = item.icon;
            const content = (
              <div className={`p-3 rounded-xl border border-gray-800 ${item.bg} backdrop-blur-sm hover:border-gray-700 transition-colors`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-white truncate">{item.value}</p>
                  </div>
                </div>
              </div>
            );

            if (item.href) {
              return (
                <Link key={index} href={item.href} className="block">
                  {content}
                </Link>
              );
            }

            return <div key={index}>{content}</div>;
          })}
        </div>

        {/* Login URL */}
        {loginUrl && (
          <div className="p-3 rounded-xl border border-gray-800 bg-indigo-500/10 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Login URL</p>
                <p className="text-sm font-medium text-white truncate">{loginUrl}</p>
              </div>
              <button
                onClick={handleCopyLoginUrl}
                className="ml-3 w-8 h-8 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center justify-center shrink-0 transition-colors"
                title="Copy login URL"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-indigo-400" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {onViewBills && (
            <Button className="flex-1 gap-2" onClick={() => onViewBills(customer)}>
              <Receipt className="w-4 h-4" />
              View Bills
            </Button>
          )}
          {onEditCustomer && (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onEditCustomer(customer)}
            >
              Edit Customer
            </Button>
          )}
        </div>
      </div>
    </BaseGlassModal>
  );
}
