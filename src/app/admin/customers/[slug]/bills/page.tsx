/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { RealtimeBillList } from "@/components/realtime/realtime-bill-list";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { CentralShareModal } from "@/components/ui/central-share-modal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";
import { useBills, useCustomers } from "@/hooks/use-sanity-data";
import { useLocaleStore } from "@/store/locale-store";
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Copy,
  Search,
  Share2,
} from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  sharePendingBills,
  generatePendingBillsMessage,
  PendingBillShareInput,
} from "@/lib/pending-bill-share";
import { sanitizeUserText } from "@/constants/defaults";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";
import {
  calculateCustomerPendingSummary,
  DEFAULT_REMINDER_LIMIT,
  getEffectiveReminderLimit,
} from "@/lib/due-reminder";
import { sanityClient } from "@/lib/sanity";
import { shareToWhatsAppApp } from "@/lib/whatsapp-app-share";
import { useAuthStore } from "@/store/auth-store";

export default function CustomerBillsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consumedOpenRef = useRef("");
  const slug = (params as { slug?: string } | null)?.slug as string;
  const { currency } = useLocaleStore();

  const { customers, isLoading: customersLoading } = useCustomers();
  const { bills, isLoading: billsLoading, updateBill } = useBills();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReminderSettingsModal, setShowReminderSettingsModal] =
    useState(false);
  const [shareMode, setShareMode] = useState<"pending" | "thank">("pending");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSavingReminderSettings, setIsSavingReminderSettings] =
    useState(false);
  const [reminderLimit, setReminderLimit] = useState<number>(
    DEFAULT_REMINDER_LIMIT,
  );
  const [dueReminderRepeatDays, setDueReminderRepeatDays] = useState<number>(6);
  const [allowDueReminder, setAllowDueReminder] = useState<boolean>(true);
  const [reminderIntervalDays, setReminderIntervalDays] = useState<number>(7);
  const [preferredChannels, setPreferredChannels] = useState<string[]>(["email"]);
  const [preferredReminderTime, setPreferredReminderTime] = useState<string>("08:30");
  const [isSendingManualReminder, setIsSendingManualReminder] = useState(false);

  const role = useAuthStore((s) => s.role);
  const isAdmin = role === "admin" || role === "super_admin";
  const customer = customers.find(
    (c) => c._id === slug || c.customerId === slug,
  );
  const effectiveCustomerId = customer?._id || slug;

  const getCustomerId = (c: any) =>
    typeof c === "string" ? c : c?._id || c?._ref;

  const customerBills = bills.filter((bill: any) => {
    const cust = bill?.customer;
    const custId = getCustomerId(cust);
    const custCustomerId =
      typeof cust === "object" && cust !== null
        ? ((cust as any).customerId as string | undefined)
        : undefined;
    return (
      custId === effectiveCustomerId ||
      (custCustomerId ? custCustomerId === slug : false)
    );
  });

  const stats = {
    totalBills: customerBills.length,
    totalAmount: customerBills.reduce((s, b) => s + (b.totalAmount || 0), 0),
    paidAmount: customerBills.reduce((s, b) => {
      if (b.paymentStatus === "paid") return s + (b.totalAmount || 0);
      if (b.paymentStatus === "partial") return s + (b.paidAmount || 0);
      return s;
    }, 0),
    pendingAmount: customerBills
      .filter((b) => b.paymentStatus !== "paid")
      .reduce((s, b) => s + (b.balanceAmount ?? b.totalAmount ?? 0), 0),
  };

  const pendingBillsCount = customerBills.filter(
    (b) => b.paymentStatus !== "paid",
  ).length;

  const pendingSummary = calculateCustomerPendingSummary(
    customerBills.map((b: any) => ({
      billId: String(b?._id || b?.id || ""),
      billNumber: b?.billNumber,
      paymentStatus: b?.paymentStatus,
      status: b?.status,
      totalAmount: Number(b?.totalAmount || 0),
      paidAmount: Number(b?.paidAmount || 0),
      balanceAmount:
        typeof b?.balanceAmount === "number"
          ? Number(b.balanceAmount)
          : undefined,
      dueDate: b?.dueDate,
    })),
  );

  const statCards = [
    { label: "Total Bills", value: stats.totalBills, color: "text-white" },
    {
      label: "Total Amount",
      value: `${currency}${stats.totalAmount.toLocaleString()}`,
      color: "text-white",
    },
    {
      label: "Paid Amount",
      value: `${currency}${stats.paidAmount.toLocaleString()}`,
      color: "text-green-400",
    },
    {
      label: "Pending Amount",
      value: `${currency}${stats.pendingAmount.toLocaleString()}`,
      color: "text-orange-400",
    },
  ];

  const handleViewBill = (bill: unknown) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const closeBillModal = () => {
    setShowBillModal(false);
    if (!searchParams.has("open")) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("open");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const cleanOpenQuery = () => {
    if (!searchParams.has("open")) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("open");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  useEffect(() => {
    const openBillId = searchParams.get("open");
    if (!openBillId || billsLoading || !customerBills.length) return;
    const bill = customerBills.find(
      (item: any) => String(item._id || item.id || item.billId) === openBillId,
    );
    if (bill) {
      if (consumedOpenRef.current !== openBillId) {
        consumedOpenRef.current = openBillId;
        handleViewBill(bill);
      }
      cleanOpenQuery();
    }
  }, [billsLoading, customerBills, searchParams]);

  const syncReminderSettingsFromCustomer = () => {
    setReminderLimit(
      getEffectiveReminderLimit((customer as any)?.reminderLimit),
    );
    setAllowDueReminder((customer as any)?.allowDueReminder ?? true);
    const repeatDays = Number((customer as any)?.dueReminderRepeatDays);
    setDueReminderRepeatDays(
      Number.isFinite(repeatDays) && repeatDays >= 1
        ? Math.min(30, Math.max(1, repeatDays))
        : 6,
    );
    const intervalDays = Number((customer as any)?.reminderIntervalDays);
    setReminderIntervalDays(
      Number.isFinite(intervalDays) && intervalDays >= 1
        ? Math.min(60, Math.max(1, intervalDays))
        : 7,
    );
    setPreferredChannels(
      Array.isArray((customer as any)?.preferredChannels)
        ? (customer as any).preferredChannels.filter((c: string) => c === "email")
        : ["email"],
    );
    setPreferredReminderTime(
      String((customer as any)?.preferredReminderTime || "08:30"),
    );
  };
  useEffect(() => {
    syncReminderSettingsFromCustomer();
  }, [
    customer?._id,
    (customer as any)?.reminderLimit,
    (customer as any)?.allowDueReminder,
    (customer as any)?.dueReminderRepeatDays,
    (customer as any)?.reminderIntervalDays,
    (customer as any)?.preferredChannels,
    (customer as any)?.preferredReminderTime,
  ]);

  const saveReminderSettings = async () => {
    if (!customer?._id) return;
    try {
      setIsSavingReminderSettings(true);
      const safeLimit = getEffectiveReminderLimit(reminderLimit);
      const safeRepeatDays = Math.min(
        30,
        Math.max(1, Number(dueReminderRepeatDays || 6)),
      );
      const safeIntervalDays = Math.min(
        60,
        Math.max(1, Number(reminderIntervalDays || 7)),
      );
      await sanityClient
        .patch(customer._id)
        .set({
          reminderLimit: safeLimit,
          dueReminderRepeatDays: safeRepeatDays,
          allowDueReminder: !!allowDueReminder,
          reminderIntervalDays: safeIntervalDays,
          preferredChannels,
          preferredReminderTime,
          updatedAt: new Date().toISOString(),
        })
        .commit();
      setReminderLimit(safeLimit);
      setDueReminderRepeatDays(safeRepeatDays);
      setReminderIntervalDays(safeIntervalDays);
      toast.success("Reminder settings updated");
    } catch (e) {
      toast.error("Failed to save reminder settings");
    } finally {
      setIsSavingReminderSettings(false);
    }
  };

  const openWhatsAppWithMessage = async (message: string) => {
    const phone = String(customer?.phone || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Customer phone number is required");
      return false;
    }
    try {
      await shareToWhatsAppApp({ text: message, phone });
      return true;
    } catch {
      toast.error("Unable to open WhatsApp");
      return false;
    }
  };

  const sendManualReminder = async () => {
    if (!customer?._id) return;
    try {
      setIsSendingManualReminder(true);
      const opened = await openWhatsAppWithMessage(buildShareMessage("pending"));
      if (opened) setShowReminderSettingsModal(false);
    } finally {
      setIsSendingManualReminder(false);
    }
  };

  const handleCreateBill = () => {
    try {
      localStorage.setItem("bill_create_skip_restore", "1");
    } catch {}
    router.push(
      `/admin/billing/create?customerId=${effectiveCustomerId}&fresh=1`,
    );
  };

  const handleOpenCustomerChat = () => {
    router.push(
      `/admin/chat?customerId=${encodeURIComponent(effectiveCustomerId)}`,
    );
  };

  const buildShareMessage = (mode: "pending" | "thank" = shareMode) => {
    const pendingData = getPendingBillsShareData();
    return mode === "pending"
      ? generatePendingBillsMessage(pendingData)
      : generateThankYouMessage({
          name: customer?.name || "Customer",
          phone: customer?.phone || "",
          secretKey: customer?.secretKey || "",
        });
  };

  const handleSharePendingBills = () => {
    setShareMode("pending");
    setShowShareModal(true);
  };
  const handleShareThankNote = () => {
    setShareMode("thank");
    setShowShareModal(true);
  };

  const getPendingBillsShareData = (): PendingBillShareInput => {
    const pending = customerBills.filter(
      (b: any) => b.paymentStatus !== "paid",
    );

    const pendingBillsDetailed = pending.map((b: any) => {
      const amount =
        Number(b.balanceAmount ?? b.totalAmount ?? b.total ?? 0) || 0;

      const tech =
        typeof b.technician === "string"
          ? b.technician
          : b.technician?.name
            ? { name: b.technician.name }
            : undefined;

      const items = Array.isArray(b.items)
        ? b.items.map((it: any) => {
            const qty = it?.qty ?? it?.quantity ?? it?.qtyCount;
            const rate = it?.rate ?? it?.price ?? it?.unitPrice;
            const amountLine =
              it?.totalPrice ??
              it?.amount ??
              (Number(qty || 0) * Number(rate || 0) || undefined);
            return {
              name: it?.product?.name || it?.name,
              qty: typeof qty === "number" ? qty : undefined,
              rate: typeof rate === "number" ? rate : undefined,
              amount: typeof amountLine === "number" ? amountLine : undefined,
            };
          })
        : undefined;

      return {
        billId: b._id || b.id || b.billId,
        billNumber: b.billNumber,
        amount,
        service: b.serviceType || b.service || b.title,
        serviceDate: b.serviceDate,
        createdAt: b.createdAt,
        note: b.note || b.notes || b.description,
        technician: tech,
        items,
      };
    });

    return {
      customer: { name: customer?.name, phone: customer?.phone },
      pendingBillsCount: pendingBillsDetailed.length,
      pendingAmount: stats.pendingAmount,
      currency,
      customerAuth: { secretKey: customer?.secretKey },
      pendingBills: pendingBillsDetailed,
    };
  };

  const handleShareOnWhatsApp = async () => {
    if (!isAdmin) {
      toast.error("Only Admin and Super Admin can send WhatsApp messages");
      return;
    }

    try {
      setIsSendingWhatsApp(true);
      const opened = await openWhatsAppWithMessage(buildShareMessage());
      if (opened) setShowShareModal(false);
    } catch (e: any) {
      const msg = e?.message || "Unable to open WhatsApp";
      toast.error(msg);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };
  const handleNativeShare = () => {
    const message = buildShareMessage();

    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        (navigator as any).share({ text: message }).catch(() => {});
        setShowShareModal(false);
      }
    } catch {
      toast.error("Unable to send WhatsApp message");
    }
  };

  const handleCopyToClipboard = () => {
    const message = buildShareMessage().replace(
      `https://jambh-ell.vercel.app/login?phone=${encodeURIComponent(
        customer?.phone || "",
      )}&passKey=${encodeURIComponent(customer?.secretKey || "")}`,
      "https://jambh-ell.vercel.app/#request",
    );

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(message)
        .then(() => {
          toast.success(
            shareMode === "pending"
              ? "Pending bill details copied to clipboard!"
              : "Thank note copied to clipboard!",
          );
          setShowShareModal(false);
        })
        .catch(() => {
          toast.error("Failed to copy to clipboard");
        });
    }
  };
  function generateThankYouMessage({
    name,
    phone,
    secretKey,
  }: {
    name?: string;
    phone?: string;
    secretKey?: string;
  }) {
    const safeName = name || "Customer";
    const digits = (phone || "").replace(/\D/g, "");
    const passKey = secretKey || "";
    const loginUrl = `https://jambh-ell.vercel.app/login?phone=${encodeURIComponent(
      digits,
    )}&passKey=${encodeURIComponent(passKey)}`;

    return (
      `Dear ${(name || "Customer").trim()},\n\n` +
      `We're happy to let you know that all your bills have been successfully paid ✅\n` +
      `Thank you so much for clearing everything on time — we really appreciate it.\n\n` +
      `🔐 Your bills are ready to view. Click below to access your account safely:\n` +
      `${loginUrl}\n\n` +
      `Your account is password-protected and private. Only you can see your billing info.\n\n` +
      `Thanks for trusting Jambh Electrical Services.\n` +
      `Always here if you need anything ⚡🙏\n\n` +
      `— Jambh Electrical Services`
    );
  }
  const handleUpdatePayment = async (
    billId: string,
    paymentData: {
      paymentStatus: "pending" | "partial" | "paid";
      paidAmount: number;
      balanceAmount: number;
      discount?: number;
    },
  ) => {
    try {
      const existingBill = bills.find(
        (b: any) => (b._id || b.id) === billId,
      ) as any;
      const existingDiscount = Number(
        (existingBill?.discount ??
          existingBill?.discount ??
          existingBill?.discountAmount ??
          0) ||
          0,
      );
      const addDiscount =
        typeof paymentData.discount === "number"
          ? Math.max(Number(paymentData.discount || 0), 0)
          : 0;
      const totalDiscount = existingDiscount + addDiscount;

      // The server-side PATCH /api/bills/[id] handles the received amount by
      // creating the cashbook entry — do NOT create another entry here.
      await updateBill(billId, {
        paymentStatus: paymentData.paymentStatus,
        paidAmount: paymentData.paidAmount,
        balanceAmount: paymentData.balanceAmount,
        ...(addDiscount > 0 ? { discount: totalDiscount } : {}),
        updatedAt: new Date().toISOString(),
      } as any);

      toast.success(
        paymentData.paymentStatus === "paid"
          ? "✅ Bill marked as fully paid!"
          : `✅ Payment of ₹${paymentData.paidAmount.toFixed(2)} recorded successfully!`,
      );

      if (selectedBill?._id === billId) {
        setSelectedBill({
          ...selectedBill,
          paymentStatus: paymentData.paymentStatus,
          paidAmount: paymentData.paidAmount,
          balanceAmount: paymentData.balanceAmount,
          ...(addDiscount > 0 ? { discount: totalDiscount } : {}),
        });
      }
    } catch (error) {
      console.error("❌ Payment update failed:", error);
      toast.error("❌ Failed to update payment. Please try again.");
    }
  };

  if (customersLoading || billsLoading) {
    return (
      <div className="flex items-center justify-center h-[var(--app-vh,100dvh)] text-white">
        Loading...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-[var(--app-vh,100dvh)] text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Customer Not Found
        </h1>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex max-sm:flex-col sm:items-center gap-4 w-full justify-between">
        <div className="flex items-center gap-4">
          {" "}
          <Button variant="ghost" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base md:text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              {getAdminCustomerDisplayName(customer)}&apos;s Bills
            </h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">
              {customer.phone} • {customer.location}
            </p>
          </div>
        </div>
        <div className="flex gap-2 max-md:justify-end">
          <Button variant="outline" onClick={handleOpenCustomerChat}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </Button>
          {pendingBillsCount > 0 ? (
            <Button variant="secondary" onClick={handleSharePendingBills}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Pending Bill's
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleShareThankNote}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Thank Note
            </Button>
          )}
          <Button
            onClick={handleCreateBill}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Bill
          </Button>
        </div>
      </div>

      {/* Stats */}
      <ResponsiveAccordion title="Stats and Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 mt-2">
          {statCards.map((s) => (
            <Card key={s.label} className="bg-gray-900 border-gray-800">
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium leading-none">
                      {s.label}
                    </p>
                    <p
                      className={`text-base md:text-lg lg:text-2xl font-bold ${s.color}`}
                    >
                      {s.value}
                    </p>
                  </div>
                  <FileText className={`md:w-8 md:h-8 h-5 w-5 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}

        <div className="relative mt-3">
          {" "}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
          <Input
            placeholder="Search bills by bill number or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="!pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </ResponsiveAccordion>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-gray-400">
              Pending: {currency}
              {pendingSummary.totalPendingAmount.toLocaleString()} • Bills:{" "}
              {pendingSummary.pendingBillsCount}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReminderSettingsModal(true)}
            >
              Reminder Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Bills ({customerBills.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <RealtimeBillList
            initialBills={customerBills}
            customerId={effectiveCustomerId}
            searchTerm={searchTerm}
            onBillClick={handleViewBill}
            showNewBillAnimation
          />
        </CardContent>
      </Card>

      {/* Bill Modal */}
      <BillDetailModal
        isOpen={showBillModal}
        onClose={closeBillModal}
        bill={selectedBill}
        onDownloadPDF={() => {}}
        onUpdatePayment={handleUpdatePayment}
        showShareButton
        showPaymentControls
      />

      {/* Share Modal */}
      <CentralShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share"
        actions={[
          {
            label: "Send WhatsApp Message",
            loadingLabel: "Sending...",
            icon: MessageSquare,
            onClick: handleShareOnWhatsApp,
            primary: true,
            loading: isSendingWhatsApp,
          },
          {
            label: "Native Share",
            icon: Smartphone,
            onClick: handleNativeShare,
          },
          {
            label: "Copy to Clipboard",
            icon: Copy,
            onClick: handleCopyToClipboard,
          },
        ]}
      />

      <Modal
        isOpen={showReminderSettingsModal}
        onClose={() => setShowReminderSettingsModal(false)}
        title="Due Reminder Settings"
        size="md"
      >
        <div className="space-y-4">
          {/* Reminder Info Section */}
          {customer && (
            <div className="space-y-2 bg-gray-800/50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-300">Reminder Info</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Last Reminder:</span>
                  <p className="text-gray-200">
                    {(customer as any).lastDueReminderSentAt
                      ? new Date((customer as any).lastDueReminderSentAt).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Reminder Count:</span>
                  <p className="text-gray-200">
                    {(customer as any).reminderCount || 0} total
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Automatic Reminders Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 border-b border-gray-800 pb-2">
              Automatic Reminders
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-gray-300">Reminder Limit</label>
                <Input
                  type="number"
                  min={0}
                  value={reminderLimit}
                  onChange={(e) =>
                    setReminderLimit(
                      Math.max(0, Number(e.target.value || DEFAULT_REMINDER_LIMIT)),
                    )
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-400">
                  Only send when pending amount is at or above this limit.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-300">Enabled</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowDueReminder}
                    onChange={(e) => setAllowDueReminder(e.target.checked)}
                  />
                  <span className="text-sm text-gray-200">
                    {allowDueReminder ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-300">
                  First Reminder Offset (Days after due date)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={dueReminderRepeatDays}
                  onChange={(e) =>
                    setDueReminderRepeatDays(
                      Math.min(60, Math.max(1, Number(e.target.value || 6))),
                    )
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-400">
                  First reminder sends this many days after due date.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-300">
                  Reminder Interval (Days)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={reminderIntervalDays}
                  onChange={(e) =>
                    setReminderIntervalDays(
                      Math.min(60, Math.max(1, Number(e.target.value || 7))),
                    )
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-400">
                  Subsequent reminders repeat after this many days.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-300">Preferred Channels</label>
                <div className="flex flex-wrap gap-3">
                  {["email"].map((ch) => (
                    <label key={ch} className="flex items-center gap-1.5 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={preferredChannels.includes(ch)}
                        onChange={() =>
                          setPreferredChannels((prev) =>
                            prev.includes(ch)
                              ? prev.filter((c) => c !== ch)
                              : [...prev, ch],
                          )
                        }
                      />
                      Email
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Reminders are sent via email.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-300">Preferred Time</label>
                <Input
                  type="time"
                  value={preferredReminderTime}
                  onChange={(e) => setPreferredReminderTime(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Manual Reminder Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 border-b border-gray-800 pb-2">
              Manual Reminder
            </h3>
            <p className="text-xs text-gray-500">
              Send a reminder immediately for the latest pending bill.
            </p>
            <Button
              onClick={sendManualReminder}
              disabled={isSendingManualReminder}
              className="w-full"
            >
              {isSendingManualReminder ? "Sending..." : "Send Reminder Now"}
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReminderSettingsModal(false)}
            >
              Close
            </Button>
            <Button
              onClick={saveReminderSettings}
              disabled={isSavingReminderSettings}
            >
              {isSavingReminderSettings ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
