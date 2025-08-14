import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useBills } from "@/hooks/use-sanity-data";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useShallow } from 'zustand/react/shallow';

export const useBillsHistory = () => {
  const { user } = useAuthStore();
  const { getBillsByCustomer } = useBills();
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  
  // Get real-time updates from the bill store
  const { bills: allBills, initializeRealtime, cleanupRealtime } = useSanityBillStore(
    useShallow((state) => ({
      bills: state.bills,
      initializeRealtime: state.initializeRealtime,
      cleanupRealtime: state.cleanupRealtime,
    }))
  );

  // Effect to load initial bills and handle real-time updates
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    setIsLoading(true);

    // Function to update bills from the store
    const updateBillsFromStore = () => {
      if (!isMounted) return;
      try {
        const customerBills = getBillsByCustomer(user.id);
        setBills(customerBills);
        setError(null);
      } catch (err) {
        console.error('Error updating bills from store:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    updateBillsFromStore();

    // Set up a small interval to check for updates
    const checkInterval = setInterval(updateBillsFromStore, 1000);

    // Cleanup
    return () => {
      isMounted = false;
      clearInterval(checkInterval);
    };
  }, [user?.id, getBillsByCustomer]);

  // Calculate total amount for all bills
  const totalAmount = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  
  // Calculate total paid amount
  const totalPaid = bills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
  
  // Calculate total pending amount
  const totalPending = bills.reduce((sum, bill) => {
    if (bill.paymentStatus === 'pending' || bill.paymentStatus === 'partial') {
      return sum + (bill.balanceAmount || bill.totalAmount || 0);
    }
    return sum;
  }, 0);

  // Apply filters
  const filteredBills = bills.filter((bill) => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      (bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.billId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bill.customer?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bill.items || []).some((item: any) =>
        (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      ));

    // Status filter
    const matchesStatus = 
      selectedStatus === "all" || 
      (selectedStatus === 'paid' ? 
        bill.paymentStatus === 'paid' : 
        (bill.paymentStatus === 'pending' || bill.paymentStatus === 'partial'));

    // Time range filter
    let matchesTimeRange = true;
    if (timeRange !== "all") {
      const billDate = new Date(bill.createdAt || bill.serviceDate || new Date().toISOString());
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
    const paidAmount = sortedBills.reduce((sum, bill) => {
      if (bill.paymentStatus === "paid") {
        return sum + getTotalAmount(bill);
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.paidAmount || 0);
      }
      return sum;
    }, 0);
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

  const stats = getStats();
  
  return {
    bills: sortedBills,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    timeRange,
    setTimeRange,
    selectedBill,
    setSelectedBill,
    showBillModal,
    setShowBillModal,
    handleViewBill,
    handleDownloadBill,
    getBillStatusColor,
    getTotalAmount,
    getServiceTypeLabel,
    getStats,
    // Additional calculated values
    totalAmount,
    totalPaid,
    totalPending,
    paymentStatusCounts: {
      pending: bills.filter(bill => bill.paymentStatus === 'pending').length,
      partial: bills.filter(bill => bill.paymentStatus === 'partial').length,
      paid: bills.filter(bill => bill.paymentStatus === 'paid').length,
      overdue: bills.filter(bill => bill.paymentStatus === 'overdue').length,
    },
    // Stats from getStats
    ...stats
  };
};
