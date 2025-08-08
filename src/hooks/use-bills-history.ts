import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useBills } from "@/hooks/use-sanity-data";

export const useBillsHistory = () => {
  const { user } = useAuthStore();
  const { getAllBills } = useBills() as any;
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getAllBills
        .execute()
        .then((result: any) => {
          setBills(result.data || []);
          setError(null);
        })
        .catch((err: any) => setError(err))
        .finally(() => setIsLoading(false));
    }
  }, [user?.id, getAllBills]);

  // Filter bills for current customer
  const customerBills = bills.filter(
    (bill) =>
      bill.customer?.customerId === user?.id || bill.customer?._id === user?.id
  );

  // Apply filters
  const filteredBills = customerBills.filter((bill) => {
    // Search filter
    const matchesSearch =
      bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.items?.some((item: any) =>
        item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // Status filter
    const matchesStatus =
      selectedStatus === "all" || bill.status === selectedStatus;

    // Time range filter
    let matchesTimeRange = true;
    if (timeRange !== "all") {
      const billDate = new Date(bill.createdAt || bill.serviceDate);
      const daysAgo = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      matchesTimeRange = billDate >= cutoffDate;
    }

    return matchesSearch && matchesStatus && matchesTimeRange;
  });

  // Sort bills by date (newest first)
  const sortedBills = [...filteredBills].sort(
    (a, b) =>
      new Date(b.createdAt || b.serviceDate).getTime() -
      new Date(a.createdAt || a.serviceDate).getTime()
  );

  const handleViewBill = (bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const handleDownloadBill = async (bill: any) => {
    try {
      console.log("Downloading bill:", bill.billId);
      // PDF generation implementation
    } catch (error) {
      console.error("Error downloading bill:", error);
    }
  };

  const getBillStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-900 text-green-300";
      case "pending":
        return "bg-yellow-900 text-yellow-300";
      case "overdue":
        return "bg-red-900 text-red-300";
      case "cancelled":
        return "bg-gray-900 text-gray-300";
      default:
        return "bg-blue-900 text-blue-300";
    }
  };

  const getTotalAmount = (bill: any) => {
    return (
      bill.items?.reduce(
        (total: number, item: any) => total + (item.totalPrice || 0),
        0
      ) || 0
    );
  };

  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case "sale":
        return "Sale";
      case "repair":
        return "Repair";
      case "installation":
        return "Installation";
      case "maintenance":
        return "Maintenance";
      default:
        return serviceType;
    }
  };

  // Calculate statistics
  const getStats = () => {
    const totalBills = sortedBills.length;
    const paidBills = sortedBills.filter(
      (bill) => bill.paymentStatus === "paid"
    ).length;
    const pendingBills = sortedBills.filter(
      (bill) => bill.paymentStatus === "pending"
    ).length;
    const overdueBills = sortedBills.filter(
      (bill) => bill.paymentStatus === "overdue"
    ).length;
    const totalAmount = sortedBills.reduce(
      (sum, bill) => sum + getTotalAmount(bill),
      0
    );
    const paidAmount = sortedBills
      .filter((bill) => bill.paymentStatus === "paid")
      .reduce((sum, bill) => sum + getTotalAmount(bill), 0);
    const pendingAmount = sortedBills
      .filter((bill) => bill.paymentStatus === "pending")
      .reduce((sum, bill) => sum + getTotalAmount(bill), 0);

    return {
      totalBills,
      paidBills,
      pendingBills,
      overdueBills,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  };

  return {
    bills: sortedBills,
    isLoading,
    error,
    searchTerm,
    selectedStatus,
    timeRange,
    selectedBill,
    showBillModal,
    setSearchTerm,
    setSelectedStatus,
    setTimeRange,
    setShowBillModal,
    handleViewBill,
    handleDownloadBill,
    getBillStatusColor,
    getTotalAmount,
    getServiceTypeLabel,
    getStats,
  };
};
