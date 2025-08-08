import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useBills } from "@/hooks/use-sanity-api";

export const useCustomerBills = () => {
  const { user } = useUser();
  const { getCustomerBills } = useBills();
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getCustomerBills
        .execute(user.id)
        .then((result) => {
          setBills(result.data || []);
          setError(null);
        })
        .catch((err) => setError(err))
        .finally(() => setIsLoading(false));
    }
  }, [user?.id, getCustomerBills]);

  // Filter bills for current customer
  const customerBills = bills.filter(
    (bill) =>
      bill.customer?.customerId === user?.id || bill.customer?._id === user?.id
  );

  // Apply search and status filters
  const filteredBills = customerBills.filter((bill) => {
    const matchesSearch =
      bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.items?.some((item: any) =>
        item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      selectedStatus === "all" || bill.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Sort bills by date (newest first)
  const sortedBills = [...filteredBills].sort(
    (a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime()
  );

  const handleViewBill = (bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const handleDownloadBill = async (bill: any) => {
    try {
      // Implementation for downloading bill PDF
      console.log("Downloading bill:", bill.billId);
      // You can implement PDF generation here
    } catch (error) {
      console.error("Error downloading bill:", error);
    }
  };

  const getBillStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
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

  return {
    bills: sortedBills,
    isLoading,
    error,
    searchTerm,
    selectedStatus,
    selectedBill,
    showBillModal,
    setSearchTerm,
    setSelectedStatus,
    setShowBillModal,
    handleViewBill,
    handleDownloadBill,
    getBillStatusColor,
    getTotalAmount,
    getServiceTypeLabel,
  };
};
