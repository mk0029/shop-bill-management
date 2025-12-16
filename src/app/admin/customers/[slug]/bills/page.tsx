/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { RealtimeBillList } from "@/components/realtime/realtime-bill-list";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";
import { useBills, useCustomers } from "@/hooks/use-sanity-data";
import { useLocaleStore } from "@/store/locale-store";
import { ArrowLeft, FileText, Search, MessageSquare, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useChatStore } from "@/store/chat-store";
import { sharePendingBills } from "@/lib/pending-bill-share";

export default function CustomerBillsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = (params as { slug?: string } | null)?.slug as string;
  const { currency } = useLocaleStore();

  const { customers, isLoading: customersLoading } = useCustomers();
  const { bills, isLoading: billsLoading, updateBill } = useBills();
  const { openRoomByCustomer, setActiveRoom } = useChatStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  const customer = customers.find((c) => c._id === customerId);

  const getCustomerId = (c: any) =>
    typeof c === "string" ? c : c?._id || c?._ref;

  const customerBills = bills.filter(
    (bill: any) => getCustomerId(bill.customer) === customerId
  );

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
      .reduce((s, b) => s + (b.balanceAmount || b.totalAmount || 0), 0),
  };

  const pendingBillsCount = customerBills.filter((b) => b.paymentStatus !== "paid").length;

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

  const handleCreateBill = () => {
    try {
      localStorage.setItem("bill_create_skip_restore", "1");
    } catch {}
    router.push(`/admin/billing/create?customerId=${customerId}&fresh=1`);
  };

  const handleOpenChat = async () => {
    try {
      const roomId = await openRoomByCustomer(String(customerId));
      await setActiveRoom(roomId);
      router.push(`/admin/chats?customerId=${encodeURIComponent(String(customerId))}`);
    } catch {
      toast.error("❌ Unable to open chat. Please try again.");
    }
  };

  const handleSharePendingBills = async () => {
    try {
      const pending = customerBills.filter((b: any) => b.paymentStatus !== "paid");

      const pendingBillsDetailed = pending.map((b: any) => {
        const amount =
          Number(
            b.balanceAmount ??
            b.totalAmount ??
            b.total ??
            0
          ) || 0;

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
                it?.totalPrice ?? it?.amount ?? (Number(qty || 0) * Number(rate || 0) || undefined);
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

      await sharePendingBills({
        customer: { name: customer?.name, phone: customer?.phone },
        pendingBillsCount: pendingBillsDetailed.length,
        pendingAmount: stats.pendingAmount,
        currency,
        pendingBills: pendingBillsDetailed,
      });
    } catch {
      toast.error("❌ Unable to share pending bill details. Please try again.");
    }
  };

  const handleUpdatePayment = async (
    billId: string,
    paymentData: { paymentStatus: "pending" | "partial" | "paid"; paidAmount: number; balanceAmount: number; discount?: number }
  ) => {
    try {
      const existingBill = bills.find((b: any) => (b._id || b.id) === billId) as any;
      const existingDiscount = Number(
        (existingBill?.discount ?? existingBill?.discount ?? existingBill?.discountAmount ?? 0) || 0
      );
      const addDiscount = typeof paymentData.discount === 'number' ? Math.max(Number(paymentData.discount || 0), 0) : 0;
      const totalDiscount = existingDiscount + addDiscount;

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
          : `✅ Payment of ₹${paymentData.paidAmount.toFixed(2)} recorded successfully!`
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
    } catch {
      toast.error("❌ Failed to update payment. Please try again.");
    }
  };

  if (customersLoading || billsLoading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Customer Not Found</h1>
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
       <div className="flex items-center gap-4"> <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-base md:text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            {customer.name}&apos;s Bills
          </h1>
          <p className="text-gray-400 mt-1 text-sm md:text-base">
            {customer.phone} • {customer.location}
          </p>
        </div></div>
        <div className="flex gap-2 max-md:justify-end">
          <Button variant="secondary" onClick={handleSharePendingBills}>
            <Share2 className="w-4 h-4 mr-2" />
            Share Pending Bill Details
          </Button>
          <Button variant="outline" onClick={handleOpenChat}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Button onClick={handleCreateBill} className="bg-blue-600 hover:bg-blue-700">
            Add Bill
          </Button>
        </div>
      </div>

      {/* Stats */}
      <ResponsiveAccordion title="Stats and Filters" >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 mt-2">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-gray-900 border-gray-800">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium leading-none">{s.label}</p>
                  <p className={`text-base md:text-lg lg:text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <FileText className={`md:w-8 md:h-8 h-5 w-5 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
     

      {/* Search */}
     
         <div className="relative mt-3"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
          <Input
            placeholder="Search bills by bill number or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          /></div>
        </ResponsiveAccordion>

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
            customerId={customerId}
            searchTerm={searchTerm}
            onBillClick={handleViewBill}
            showNewBillAnimation
          />
        </CardContent>
      </Card>

      {/* Bill Modal */}
      <BillDetailModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        bill={selectedBill}
        onDownloadPDF={() => {}}
        onUpdatePayment={handleUpdatePayment}
        showShareButton
        showPaymentControls
      />
    </div>
  );
}