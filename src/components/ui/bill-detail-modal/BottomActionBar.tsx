"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  CreditCard,
  Share2,
  Printer,
  Trash2,
  Copy,
  Bell,
  MessageSquare,
  MoreHorizontal,
  X,
  UserPlus,
  History,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomActionBarProps {
  role: "admin" | "customer";
  bill: any;
  onEditBill?: (bill: any) => void;
  onUpdatePayment?: () => void;
  onShare?: () => void;
  onWhatsAppCustomer?: () => void;
  onRemindCustomer?: () => void;
  onDeleteBill?: (billId: string) => void;
  onDuplicateBill?: (bill: any) => void;
  onPayOnline?: (bill: any) => void;
  onPrintBill?: (bill: any) => void;
  onAssignTechnician?: (bill: any) => void;
  onViewAudit?: (bill: any) => void;
  onSendWhatsAppReminder?: () => void;
  isSendingReminder?: boolean;
  isSendingWhatsApp?: boolean;
}

export const BottomActionBar = memo(function BottomActionBar({
  role,
  bill,
  onEditBill,
  onUpdatePayment,
  onShare,
  onWhatsAppCustomer,
  onRemindCustomer,
  onDeleteBill,
  onDuplicateBill,
  onPayOnline,
  onPrintBill,
  onAssignTechnician,
  onViewAudit,
  onSendWhatsAppReminder,
  isSendingReminder,
  isSendingWhatsApp,
}: BottomActionBarProps) {
  const [expanded, setExpanded] = useState(false);

  const adminActions = [
    ...(onEditBill
      ? [
          {
            icon: Edit3,
            label: "Edit Bill",
            onClick: () => onEditBill(bill),
            color: "text-sky-300",
          },
        ]
      : []),
    ...(onUpdatePayment
      ? [
          {
            icon: CreditCard,
            label: "Payment",
            onClick: onUpdatePayment,
            color: "text-emerald-300",
          },
        ]
      : []),
    ...(onShare
      ? [
          {
            icon: Share2,
            label: "Share",
            onClick: onShare,
            color: "text-indigo-300",
          },
        ]
      : []),
    ...(onWhatsAppCustomer
      ? [
          {
            icon: isSendingWhatsApp ? Loader2 : MessageSquare,
            label: isSendingWhatsApp ? "Sending..." : "WhatsApp",
            onClick: onWhatsAppCustomer,
            color: "text-emerald-300",
            highlight: isSendingWhatsApp,
          },
        ]
      : []),
  ];

  const adminMoreActions = [
    ...(onPrintBill
      ? [
          {
            icon: Printer,
            label: "Print",
            onClick: () => onPrintBill(bill),
            color: "text-amber-300",
          },
        ]
      : []),
    ...(onRemindCustomer
      ? [
          {
            icon: Bell,
            label: "Remind",
            onClick: onRemindCustomer,
            color: "text-rose-300",
          },
        ]
      : []),
    ...(onSendWhatsAppReminder
      ? [
          {
            icon: isSendingReminder ? Loader2 : Send,
            label: isSendingReminder ? "Sending..." : "Send Reminder",
            onClick: onSendWhatsAppReminder,
            color: "text-emerald-300",
            highlight: true,
          },
        ]
      : []),
    ...(onDuplicateBill
      ? [
          {
            icon: Copy,
            label: "Duplicate",
            onClick: () => onDuplicateBill(bill),
            color: "text-violet-300",
          },
        ]
      : []),
    ...(onAssignTechnician
      ? [
          {
            icon: UserPlus,
            label: "Assign Tech",
            onClick: () => onAssignTechnician(bill),
            color: "text-sky-300",
          },
        ]
      : []),
    ...(onViewAudit
      ? [
          {
            icon: History,
            label: "Audit",
            onClick: () => onViewAudit(bill),
            color: "text-white/70",
          },
        ]
      : []),
    ...(onDeleteBill
      ? [
          {
            icon: Trash2,
            label: "Delete",
            onClick: () => onDeleteBill(bill._id || bill.id || bill.billId),
            color: "text-red-300",
          },
        ]
      : []),
  ];

  const customerActions = [
    ...(onShare
      ? [
          {
            icon: Share2,
            label: "Share",
            onClick: onShare,
            color: "text-indigo-300",
          },
        ]
      : []),
    ...(onWhatsAppCustomer
      ? [
          {
            icon: MessageSquare,
            label: "WhatsApp",
            onClick: onWhatsAppCustomer,
            color: "text-emerald-300",
          },
        ]
      : []),
    ...(onPrintBill
      ? [
          {
            icon: Printer,
            label: "Print",
            onClick: () => onPrintBill(bill),
            color: "text-amber-300",
          },
        ]
      : []),
  ];

  const primaryActions = role === "admin" ? adminActions : customerActions;
  const moreActions = role === "admin" ? adminMoreActions : [];

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky -bottom-4 sm:bottom-0 z-30 mt-6"
    >
      <div className=" px-4 py-3 max-sm:mx-4 sm:px-5 flex-1 bg-slate-950/90 rounded-lg md:rounded-2xl">
        <div className="flex items-center justify-evenly gap-2.5 overflow-x-visible no-scrollbar">
          {primaryActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[72px] sm:min-w-[80px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0",
                (action as any).highlight
                  ? "glass-dock-btn-highlight text-white"
                  : "glass-dock-btn text-white/70",
              )}
            >
              <action.icon
                className={cn(
                  "w-5 h-5 sm:w-5 sm:h-5",
                  (isSendingReminder || isSendingWhatsApp) &&
                    action.label === "Sending..." &&
                    "animate-spin",
                )}
              />
              <span className="leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
});
