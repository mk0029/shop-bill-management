"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  User,
  Copy,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { safeUserName } from "@/lib/display-text";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";
import { GlassCard } from "./GlassCard";

interface CustomerCardProps {
  bill: any;
  role?: "admin" | "customer";
}

export const CustomerCard = memo(function CustomerCard({
  bill,
  role = "admin",
}: CustomerCardProps) {
  const customer = bill?.customer;
  if (!customer) return null;

  const name = safeUserName(getAdminCustomerDisplayName(customer), "Customer");
  const phone = customer.phone || "";
  const address = bill.customerAddress?.addressLine1 || customer.location || "";
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    [name],
  );

  const handleCopyNumber = () => {
    if (phone && navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      toast.success("Phone number copied");
    }
  };

  const infoRows = [
    { label: "Phone", value: phone, icon: Phone },
    { label: "Address", value: address || "—", icon: MapPin },
    { label: "Customer Type", value: customer.type || "Regular", icon: User },
    {
      label: "Outstanding",
      value: `${customer.outstandingBalance ? `₹${Number(customer.outstandingBalance).toLocaleString()}` : "—"}`,
      icon: CreditCard,
    },
    {
      label: "Total Bills",
      value: `${customer.totalBills || bill.customerTotalBills || "—"}`,
      icon: FileText,
    },
    {
      label: "Customer Since",
      value: customer.createdAt
        ? new Date(customer.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          })
        : "—",
      icon: Calendar,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard>
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400/30 to-purple-500/30 border border-white/10 flex items-center justify-center shadow-lg shadow-black/20 shrink-0"
            >
              <span className="text-lg font-bold text-white/90">{initials}</span>
            </motion.div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">
                {name}
              </h3>
              {phone && (
                <p className="text-sm text-white/50 mt-0.5">{phone}</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="glass-divider my-4" />

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {infoRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="w-3 h-3 text-white/30 shrink-0" />
                    <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium">
                      {row.label}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 truncate">{row.value}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="glass-divider my-4" />
          <div className="flex flex-wrap gap-2">
            {phone && (
              <>
                <QuickAction icon={Phone} href={`tel:${phone}`} label="Call" />
                <QuickAction
                  icon={MessageSquare}
                  href={`https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}`}
                  label="WhatsApp"
                />
                <QuickAction
                  icon={Copy}
                  onClick={handleCopyNumber}
                  label="Copy Number"
                />
              </>
            )}
            {role === "admin" && (
              <QuickAction
                icon={User}
                href={`/admin/customers/${customer._id || customer.customerId}`}
                label="View Customer"
              />
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
});

function QuickAction({
  icon: Icon,
  href,
  onClick,
  label,
}: {
  icon: any;
  href?: string;
  onClick?: () => void;
  label: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={base}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={base}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
