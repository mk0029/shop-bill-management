import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CustomerWithStats } from "@/types/customer";

export function useCustomerActions() {
  const router = useRouter();

  const navigateToAddCustomer = useCallback(() => {
    router.push("/admin/customers/add");
  }, [router]);

  const navigateToEditCustomer = useCallback(
    (customerId: string) => {
      router.push(`/admin/customers/${customerId}/edit`);
    },
    [router]
  );

  const navigateToCustomerBills = useCallback(
    (customerId: string) => {
      router.push(`/admin/customers/${customerId}/bills`);
    },
    [router]
  );

  const navigateToCreateBill = useCallback(
    (customerId: string) => {
      router.push(`/admin/billing/create?customerId=${customerId}`);
    },
    [router]
  );

  const deleteCustomer = useCallback(async (customerId: string) => {
    // TODO: Implement actual delete functionality
    try {
      console.log("Deleting customer:", customerId);
      // await deleteCustomerAPI(customerId);
      // Show success message
      // Refresh customer list
    } catch (error) {
      console.error("Failed to delete customer:", error);
      // Show error message
    }
  }, []);

  const toggleCustomerStatus = useCallback(
    async (customerId: string, isActive: boolean) => {
      // TODO: Implement status toggle functionality
      try {
        console.log("Toggling customer status:", customerId, isActive);
        // await updateCustomerStatus(customerId, !isActive);
        // Show success message
        // Refresh customer list
      } catch (error) {
        console.error("Failed to update customer status:", error);
        // Show error message
      }
    },
    []
  );

  const exportCustomerData = useCallback((customers: CustomerWithStats[]) => {
    // TODO: Implement export functionality
    console.log("Exporting customer data:", customers.length, "customers");
    // Generate CSV/Excel file
    // Trigger download
  }, []);

  const sendWhatsAppMessage = useCallback(
    (customer: CustomerWithStats, message?: string) => {
      // TODO: Implement WhatsApp integration
      const defaultMessage = `Hello ${customer.name}, this is a message from our shop.`;
      const finalMessage = message || defaultMessage;
      const whatsappUrl = `https://wa.me/${customer.phone.replace(
        /\D/g,
        ""
      )}?text=${encodeURIComponent(finalMessage)}`;
      window.open(whatsappUrl, "_blank");
    },
    []
  );

  return {
    navigateToAddCustomer,
    navigateToEditCustomer,
    navigateToCustomerBills,
    navigateToCreateBill,
    deleteCustomer,
    toggleCustomerStatus,
    exportCustomerData,
    sendWhatsAppMessage,
  };
}
