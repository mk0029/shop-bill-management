/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { RealtimeBillList } from "@/components/realtime/realtime-bill-list";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { ShareModal } from "@/components/ui/bill-detail-modal/ShareModal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Modal } from "@/components/ui/modal";
import { sendViaWaBot } from "@/lib/wa-bot-send";
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
import { sanityApiService } from "@/lib/sanity-api-service";
import {
  sharePendingBills,
  generatePendingBillsMessage,
  PendingBillShareInput,
} from "@/lib/pending-bill-share";
import { sanitizeUserText } from "@/constants/defaults";
import {
  calculateCustomerPendingSummary,
  canSendDueReminder,
  DEFAULT_REMINDER_LIMIT,
  getEffectiveReminderLimit,
} from "@/lib/due-reminder";
import { sanityClient } from "@/lib/sanity";
import { formatDayDateTime } from "@/lib/date-time";

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
  const [showReminderPreview, setShowReminderPreview] = useState(false);
  const [showReminderSettingsModal, setShowReminderSettingsModal] =
    useState(false);
  const [shareMode, setShareMode] = useState<"pending" | "thank">("pending");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSavingReminderSettings, setIsSavingReminderSettings] =
    useState(false);
  const [isPreparingReminderPreview, setIsPreparingReminderPreview] =
    useState(false);
  const [isSendingDueReminder, setIsSendingDueReminder] = useState(false);
  const [reminderPreviewMessage, setReminderPreviewMessage] = useState("");
  const [reminderPreviewSummary, setReminderPreviewSummary] = useState<{
    totalPendingAmount: number;
    pendingBillsCount: number;
  }>({ totalPendingAmount: 0, pendingBillsCount: 0 });
  const [reminderLimit, setReminderLimit] = useState<number>(
    DEFAULT_REMINDER_LIMIT,
  );
  const [dueReminderRepeatDays, setDueReminderRepeatDays] = useState<number>(6);
  const [allowDueReminder, setAllowDueReminder] = useState<boolean>(true);
  const [lastDueReminderSentAt, setLastDueReminderSentAt] = useState<
    string | null
  >(null);
  const [lastDueReminderAmount, setLastDueReminderAmount] = useState<
    number | null
  >(null);
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
  const reminderEligibility = canSendDueReminder({
    allowDueReminder,
    reminderLimit,
    totalPendingAmount: pendingSummary.totalPendingAmount,
    pendingBillsCount: pendingSummary.pendingBillsCount,
    phone: customer?.phone,
    lastDueReminderSentAt,
    lastDueReminderAmount,
  });

  const getReminderStatusLabel = () => {
    if (reminderEligibility.ok) return "Eligible to send";
    if (reminderEligibility.reason === "below_limit")
      return "Skipped: below reminder limit";
    if (reminderEligibility.reason === "toggle_off")
      return "Skipped: reminder disabled";
    if (reminderEligibility.reason === "phone_missing")
      return "Skipped: phone missing";
    if (reminderEligibility.reason === "no_pending_bills")
      return "Skipped: no pending bills";
    if (reminderEligibility.reason === "duplicate_recent")
      return `Skipped: recently sent (${reminderEligibility.cooldownRemainingMinutes || 0} min cooldown left)`;
    return "Not eligible";
  };

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
    setLastDueReminderSentAt((customer as any)?.lastDueReminderSentAt || null);
    setLastDueReminderAmount(
      typeof (customer as any)?.lastDueReminderAmount === "number"
        ? Number((customer as any).lastDueReminderAmount)
        : null,
    );
  };
  useEffect(() => {
    syncReminderSettingsFromCustomer();
  }, [
    customer?._id,
    (customer as any)?.reminderLimit,
    (customer as any)?.allowDueReminder,
    (customer as any)?.dueReminderRepeatDays,
    (customer as any)?.lastDueReminderSentAt,
    (customer as any)?.lastDueReminderAmount,
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
      await sanityClient
        .patch(customer._id)
        .set({
          reminderLimit: safeLimit,
          dueReminderRepeatDays: safeRepeatDays,
          allowDueReminder: !!allowDueReminder,
          updatedAt: new Date().toISOString(),
        })
        .commit();
      setReminderLimit(safeLimit);
      setDueReminderRepeatDays(safeRepeatDays);
      toast.success("Reminder settings updated");
    } catch (e) {
      toast.error("Failed to save reminder settings");
    } finally {
      setIsSavingReminderSettings(false);
    }
  };

  const fetchReminderPreview = async () => {
    if (!customer?._id) return;
    try {
      setIsPreparingReminderPreview(true);
      const res = await fetch("/api/whatsapp/due-reminder/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer._id, previewOnly: true }),
      });
      const json = await res.json().catch(() => ({}) as any);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to prepare reminder preview");
      }
      setReminderPreviewMessage(String(json?.message || ""));
      setReminderPreviewSummary({
        totalPendingAmount: Number(json?.summary?.totalPendingAmount || 0),
        pendingBillsCount: Number(json?.summary?.pendingBillsCount || 0),
      });
      setShowReminderPreview(true);
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare reminder preview");
    } finally {
      setIsPreparingReminderPreview(false);
    }
  };

  const sendDueReminderNow = async () => {
    if (!customer?._id) return;
    try {
      setIsSendingDueReminder(true);
      const res = await fetch("/api/whatsapp/due-reminder/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer._id, previewOnly: false }),
      });
      const json = await res.json().catch(() => ({}) as any);
      if (json?.skipped) {
        if (json?.reason === "below_limit") {
          toast.info(
            "Reminder skipped because pending amount is below reminder limit.",
          );
        } else if (json?.reason === "toggle_off") {
          toast.info("Reminder is disabled for this customer.");
        } else if (json?.reason === "no_pending_bills") {
          toast.info("No pending or partial bills found for this customer.");
        } else if (json?.reason === "phone_missing") {
          toast.info(
            "Customer phone number is required before sending WhatsApp reminder.",
          );
        } else if (json?.reason === "duplicate_recent") {
          toast.info(
            "Reminder skipped because same reminder was sent recently.",
          );
        } else {
          toast.info("Reminder skipped.");
        }
        return;
      }
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to send due reminder");
      }
      toast.success("Combined due reminder sent on WhatsApp.");
      setLastDueReminderSentAt(new Date().toISOString());
      setLastDueReminderAmount(Number(json?.summary?.totalPendingAmount || 0));
      setShowReminderPreview(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send due reminder");
    } finally {
      setIsSendingDueReminder(false);
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
  const handleShareOnWhatsApp = () => {
    const pendingData = getPendingBillsShareData();
    const message =
      shareMode === "pending"
        ? generatePendingBillsMessage(pendingData)
        : generateThankYouMessage({
            name: customer?.name || "Customer",
            phone: customer?.phone || "",
            secretKey: customer?.secretKey || "",
          });

    const rawPhone = String(customer?.phone || "");
    const phones = (() => {
      const p = rawPhone.trim();
      if (!p) return [] as string[];
      if (p.startsWith("+")) return [p];
      if (p.startsWith("0")) return [`+91${p.substring(1)}`];
      return [`+91${p}`];
    })();

    if (!phones.length) {
      toast.error("Customer phone number not found");
      return;
    }

    setIsSendingWhatsApp(true);
    sendViaWaBot({ phones, message })
      .then((r) => {
        if (r.ok) {
          toast.success(
            `WhatsApp sent: ${Number(r.sent || 0)} | Failed: ${Number(r.failed || 0)}`,
          );
          setShowShareModal(false);
        } else {
          toast.error(r.error || "Failed to send WhatsApp");
        }
      })
      .catch(() => {
        toast.error("Failed to send WhatsApp");
      })
      .finally(() => {
        setIsSendingWhatsApp(false);
      });
  };

  const handleNativeShare = () => {
    const pendingData = getPendingBillsShareData();
    const message =
      shareMode === "pending"
        ? generatePendingBillsMessage(pendingData)
        : generateThankYouMessage({
            name: customer?.name || "Customer",
            phone: customer?.phone || "",
            secretKey: customer?.secretKey || "",
          });

    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        (navigator as any).share({ text: message }).catch(() => {});
        setShowShareModal(false);
      }
    } catch {
      handleShareOnWhatsApp();
    }
  };

  const handleCopyToClipboard = () => {
    const pendingData = getPendingBillsShareData();
    const message =
      shareMode === "pending"
        ? generatePendingBillsMessage(pendingData).replace(
            `https://jambh-ell.vercel.app/login?phone=${encodeURIComponent(
              customer?.phone || "",
            )}&passKey=${encodeURIComponent(customer?.secretKey || "")}`,
            "https://jambh-ell.vercel.app/#request",
          )
        : generateThankYouMessage({
            name: customer?.name || "Customer",
            phone: customer?.phone || "",
            secretKey: customer?.secretKey || "",
          });

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
      `Dear ${sanitizeUserText(name || "Customer")},\n\n` +
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
    console.log("🔥 handleUpdatePayment called:", { billId, paymentData });

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

      // Calculate the amount being paid in this transaction
      const previousPaidAmount = Number(existingBill?.paidAmount || 0);
      const newPaidAmount = paymentData.paidAmount;
      const paymentAmount = newPaidAmount - previousPaidAmount;

      console.log("💰 Payment calculation:", {
        previousPaidAmount,
        newPaidAmount,
        paymentAmount,
        customer: customer?.name,
      });

      const updateStartTime = Date.now();
      await updateBill(billId, {
        paymentStatus: paymentData.paymentStatus,
        paidAmount: paymentData.paidAmount,
        balanceAmount: paymentData.balanceAmount,
        ...(addDiscount > 0 ? { discount: totalDiscount } : {}),
        updatedAt: new Date().toISOString(),
      } as any);

      console.log(
        `✅ Bill updated successfully in ${Date.now() - updateStartTime} ms`,
      );

      // Create cash book entry asynchronously (don't wait for it)
      if (paymentAmount > 0 && customer) {
        // Fire and forget - don't await to avoid blocking the UI
        (async () => {
          try {
            console.log("🏦 Creating cash book entry for manual payment:", {
              billId,
              userId: customer._id,
              userName: customer.name,
              amount: paymentAmount,
              paymentType: "credit",
            });

            const result =
              await sanityApiService.cashBook.createEntryFromBillPayment({
                billId: billId,
                userId: customer._id,
                userName: customer.name,
                amount: paymentAmount,
                paymentType: "credit",
              });

            console.log("📊 Manual payment cash book entry result:", result);

            if (!result.success) {
              console.error(
                "❌ Failed to create cash book entry for manual payment:",
                result.error,
              );
            } else {
              console.log(
                "✅ Cash book entry created successfully:",
                result.data,
              );
            }
          } catch (cashBookError) {
            console.error(
              "❌ Failed to create cash book entry:",
              cashBookError,
            );
            // Don't fail payment update if cash book entry fails
          }
        })(); // Execute async function without awaiting
      } else {
        console.log(
          "⚠️ No payment amount or customer data, skipping cash book entry:",
          {
            paymentAmount,
            customerExists: !!customer,
            customerName: customer?.name,
          },
        );
      }

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
              {customer.name}&apos;s Bills
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
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </ResponsiveAccordion>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-gray-300">
              Due Reminder:{" "}
              <span
                className={
                  reminderEligibility.ok ? "text-green-400" : "text-yellow-400"
                }
              >
                {getReminderStatusLabel()}
              </span>
            </p>
            <p className="text-xs text-gray-400">
              Pending: {currency}
              {pendingSummary.totalPendingAmount.toLocaleString()} • Bills:{" "}
              {pendingSummary.pendingBillsCount} • Limit: {currency}
              {Number(
                getEffectiveReminderLimit(reminderLimit),
              ).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">
              Auto reminder: first after 6 days from latest pending bill •
              Repeat every {dueReminderRepeatDays} day(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReminderSettingsModal(true)}
            >
              Reminder Settings
            </Button>
            <Button
              onClick={fetchReminderPreview}
              disabled={isPreparingReminderPreview || isSendingDueReminder}
            >
              {isPreparingReminderPreview
                ? "Preparing..."
                : "Send Due Reminder"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Bills ({customerBills.length})
          </CardTitle>
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
      <ShareModal
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        onShareOnWhatsApp={handleShareOnWhatsApp}
        onNativeShare={handleNativeShare}
        onCopyToClipboard={handleCopyToClipboard}
        isSending={isSendingWhatsApp}
      />

      <ConfirmationModal
        isOpen={showReminderPreview}
        onClose={() => setShowReminderPreview(false)}
        onConfirm={sendDueReminderNow}
        type="confirm"
        title="Preview Due Reminder"
        message={`This will send one combined reminder for ${reminderPreviewSummary.pendingBillsCount} bill(s), total ${currency}${Number(reminderPreviewSummary.totalPendingAmount || 0).toLocaleString()}.`}
        confirmText={
          isSendingDueReminder ? "Sending..." : "Send WhatsApp Reminder"
        }
        content={
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Message preview:</p>
            <pre className="whitespace-pre-wrap text-xs text-gray-200 bg-gray-950 p-2 rounded border border-gray-800 max-h-64 overflow-auto">
              {reminderPreviewMessage}
            </pre>
          </div>
        }
      />

      <Modal
        isOpen={showReminderSettingsModal}
        onClose={() => setShowReminderSettingsModal(false)}
        title="Due Reminder Settings"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-sm text-gray-300">Reminder Limit</label>
              <Input
                type="number"
                min={0}
                value={reminderLimit}
                onChange={(e) =>
                  setReminderLimit(
                    Math.max(
                      0,
                      Number(e.target.value || DEFAULT_REMINDER_LIMIT),
                    ),
                  )
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400">
                Reminder will only be sent when total pending amount is equal or
                above this limit.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-300">Send Reminder</label>
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
              <label className="text-sm text-gray-300">Repeat Gap (Days)</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={dueReminderRepeatDays}
                onChange={(e) =>
                  setDueReminderRepeatDays(
                    Math.min(30, Math.max(1, Number(e.target.value || 6))),
                  )
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400">
                Auto reminders repeat after this gap (1 to 30 days).
              </p>
            </div>
            <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3">
              <p className="text-xs text-gray-400">Current Pending</p>
              <p className="text-lg text-orange-400 font-semibold">
                {currency}
                {pendingSummary.totalPendingAmount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                {pendingSummary.pendingBillsCount} pending/partial bill(s)
              </p>
              <p
                className={`mt-2 text-xs ${reminderEligibility.ok ? "text-green-400" : "text-yellow-400"}`}
              >
                {getReminderStatusLabel()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Last reminder:{" "}
                {lastDueReminderSentAt
                  ? `${formatDayDateTime(lastDueReminderSentAt)} (Rs ${Number(lastDueReminderAmount || 0).toFixed(2)})`
                  : "Never"}
              </p>
            </div>
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
