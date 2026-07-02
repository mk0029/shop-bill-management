"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Copy,
  Phone,
  Share2,
  MessageSquare,
  Clock,
  MapPin,
  User,
  CreditCard,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { safeUserName } from "@/lib/display-text";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface PremiumBillHeaderProps {
  bill: any;
  role?: "admin" | "customer";
  currency?: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  paid: { label: "Paid", bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-400" },
  partial: { label: "Partially Paid", bg: "bg-amber-500/15", text: "text-amber-300", dot: "bg-amber-400" },
  pending: { label: "Pending", bg: "bg-sky-500/15", text: "text-sky-300", dot: "bg-sky-400" },
  overdue: { label: "Overdue", bg: "bg-rose-500/15", text: "text-rose-300", dot: "bg-rose-400" },
};

function getStatus(s: string) {
  return statusConfig[s?.toLowerCase()] || statusConfig.pending;
}

function formatDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return "—"; }
}

const toNum = (v: any): number => {
  if (typeof v === "number" && isFinite(v)) return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const PremiumBillHeader = memo(function PremiumBillHeader({
  bill,
  role = "admin",
  currency = "₹",
}: PremiumBillHeaderProps) {
  const router = useRouter();
  const status = getStatus(bill.paymentStatus || bill.status);
  const customer = bill?.customer || {};
  const customerName = safeUserName(customer.name, "Customer");
  const customerPhone = customer.phone || "";
  const address = bill.customerAddress?.addressLine1 || customer.location || customer.address || "";
  const initials = customerName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleCopy = () => {
    const id = bill.billNumber || bill._id || bill.billId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(String(id));
      toast.success("Bill ID copied");
    }
  };

  const handleViewCustomer = () => {
    const cid = customer._id || customer.customerId;
    if (!cid) { toast.error("Customer ID not found"); return; }
    router.push(`/admin/customers?customerId=${encodeURIComponent(cid)}&modal=customerDetails`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-static overflow-hidden"
    >
      <div className="p-5 sm:p-6 md:p-7">
        <div className="flex items-start gap-4 sm:gap-5">
          <motion.div whileHover={{ scale: 1.05 }} className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-sky-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center shadow-lg shadow-black/20">
              <span className="text-lg sm:text-xl font-bold text-white/90">{initials}</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">
                  Bill #{bill.billNumber || bill._id?.slice(-6) || "N/A"}
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm", status.bg, status.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </span>
                  <button onClick={handleCopy} className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white/70" title="Copy Bill ID">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs sm:text-sm text-white/50">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Bill: {formatDate(bill.createdAt || bill.date)}</span>
              </div>
              {bill.dueDate && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Due: {formatDate(bill.dueDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-divider my-4" />

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-white">{customerName}</p>
                <p className="text-sm text-white/50 mt-0.5">{customerPhone || "No phone"}</p>
                {address && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-white/30 shrink-0" />
                    <span className="text-xs text-white/40 truncate">{address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <InfoChip label="Type" value={customer.type || "Regular"} />
              <InfoChip label="Outstanding" value={customer.outstandingBalance ? `${currency}${Number(customer.outstandingBalance).toLocaleString()}` : "—"} />
              <InfoChip label="Total Bills" value={String(customer.totalBills || bill.customerTotalBills || "—")} />
              <InfoChip label="Since" value={customer.createdAt ? formatDate(customer.createdAt) : "—"} />
            </div>
          </div>
        </div>

        <div className="glass-divider my-4" />

        <div className="flex flex-wrap items-center gap-2">
          {customerPhone && (
            <>
              <ActionBtn href={`tel:${customerPhone}`} icon={Phone} label="Call" />
              <ActionBtn href={`https://wa.me/91${customerPhone.replace(/\D/g, "").slice(-10)}`} icon={MessageSquare} label="WhatsApp" />
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(customerPhone);
                    toast.success("Phone copied");
                  }
                }}
                className="glass-button px-3 py-2 rounded-full text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {role === "admin" && (customer._id || customer.customerId) && (
            <button
              onClick={handleViewCustomer}
              className="glass-button flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-white/70 hover:text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Customer</span>
            </button>
          )}
          <button
            onClick={() => {
              const msg = `Bill #${bill.billNumber || bill._id} - ${currency}${(bill.totalAmount || 0).toFixed(2)}`;
              if (navigator.share) {
                navigator.share({ text: msg }).catch(() => {});
              } else if (navigator.clipboard) {
                navigator.clipboard.writeText(msg);
                toast.success("Bill copied");
              }
            }}
            className="glass-button p-2 rounded-full"
            title="Share"
          >
            <Share2 className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

function ActionBtn({ icon: Icon, href, label }: { icon: any; href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-button flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-white/70 hover:text-white"
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium">{label}</p>
      <p className="text-xs text-white/70 truncate mt-0.5">{value}</p>
    </div>
  );
}
