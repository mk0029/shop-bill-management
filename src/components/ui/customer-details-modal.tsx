"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  MapPin,
  Receipt,
  Calendar,
  CreditCard,
  Clock,
  Copy,
  Check,
  User,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  currency?: string;
  onViewBills?: (customerId: string) => void;
  onEditCustomer?: (customerId: string) => void;
}

export const CustomerDetailsModal = memo(function CustomerDetailsModal({
  isOpen,
  onClose,
  customer,
  currency = "₹",
  onViewBills,
  onEditCustomer,
}: CustomerDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!customer) return null;

  const name = getAdminCustomerDisplayName(customer);
  const phone = customer?.phone || "";
  const address = customer?.address || customer?.location || "";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch { return "—"; }
  };

  const handleCopyPhone = () => {
    if (phone && navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      toast.success("Phone number copied");
    }
  };

  const infoRows = [
    { label: "Phone", value: phone || "—", icon: Phone },
    { label: "Location", value: address || "—", icon: MapPin },
    { label: "Type", value: customer?.type || "Regular", icon: User },
    { label: "Total Bills", value: String(customer?.totalBills ?? "—"), icon: FileText },
    { label: "Total Spent", value: customer?.totalSpent ? `${currency}${Number(customer.totalSpent).toLocaleString()}` : "—", icon: CreditCard },
    { label: "Pending", value: customer?.pendingAmount ? `${currency}${Number(customer.pendingAmount).toLocaleString()}` : "All Paid", icon: Clock },
    { label: "Member Since", value: formatDate(customer?.createdAt), icon: Calendar },
    { label: "Last Bill", value: formatDate(customer?.lastBillDate), icon: Calendar },
  ];

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Details"
      size="md"
      zIndex={350}
    >
      <div className="p-5 sm:p-6 max-sm:pb-8 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-xl font-bold text-white/90">{initials}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                customer?.isActive !== false
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-white/[0.04] text-white/40",
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", customer?.isActive !== false ? "bg-emerald-400" : "bg-white/30")} />
                {customer?.isActive !== false ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {phone && (
          <div className="flex gap-2">
            <a
              href={`tel:${phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] text-sm font-medium transition-all"
            >
              <Phone className="w-4 h-4" /> Call
            </a>
            <a
              href={`https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] text-sm font-medium transition-all"
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp
            </a>
            <button
              onClick={handleCopyPhone}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] text-sm font-medium transition-all"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {infoRows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-white/30 shrink-0" />
                  <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium">{row.label}</span>
                </div>
                <p className="text-sm text-white/80 truncate">{row.value}</p>
              </div>
            );
          })}
        </div>

        {(onViewBills || onEditCustomer) && (
          <div className="flex gap-3 pt-2">
            {onViewBills && (
              <Button
                onClick={() => onViewBills(customer?._id || customer?.customerId)}
                className="flex-1 !rounded-xl gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white border-0"
              >
                <Receipt className="w-4 h-4" />
                View Bills
              </Button>
            )}
            {onEditCustomer && (
              <Button
                variant="outline"
                onClick={() => onEditCustomer(customer?._id || customer?.customerId)}
                className="flex-1 !rounded-xl gap-2 border-white/10 text-white/70"
              >
                <User className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>
    </BaseGlassModal>
  );
});
