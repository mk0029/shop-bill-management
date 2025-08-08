"use client";

import { useEffect } from "react";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useSanityRealtimeEvent } from "@/hooks/useSanityRealtime";
import { SanityRealtimeStatus } from "@/components/providers/SanityRealtimeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export function SanityRealtimeBillList() {
  const { bills, loading, fetchBills, createBill } = useSanityBillStore();

  // Listen for real-time bill updates
  useSanityRealtimeEvent("bill:created", (newBill) => {
    console.log("🔔 New bill received via Sanity:", newBill.billNumber);
  });

  useSanityRealtimeEvent("bill:updated", (data) => {
    console.log("🔔 Bill updated via Sanity:", data.billId);
  });

  useSanityRealtimeEvent("bill:deleted", (data) => {
    console.log("🔔 Bill deleted via Sanity:", data.billId);
  });

  useEffect(() => {
    // Initial fetch of bills from Sanity
    fetchBills();
  }, [fetchBills]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Demo function to create a test bill in Sanity
  const createTestBill = async () => {
    const testBill = {
      billId: `BILL-${Date.now()}`,
      billNumber: `BILL-2024-${String(
        Math.floor(Math.random() * 1000)
      ).padStart(4, "0")}`,
      customer: "test-customer-id",
      customerAddress: "test-address-id",
      serviceType: "repair",
      locationType: "home",
      items: [
        {
          product: "test-product-id",
          productName: "Test LED Bulb",
          category: "Lighting",
          brand: "Test Brand",
          specifications: "9W, White Light",
          quantity: 2,
          unitPrice: 150,
          totalPrice: 300,
          unit: "pcs",
        },
      ],
      serviceDate: new Date().toISOString(),
      homeVisitFee: 100,
      repairCharges: 200,
      transportationFee: 50,
      laborCharges: 150,
      subtotal: 300,
      taxAmount: 54,
      discountAmount: 0,
      totalAmount: 854,
      paymentStatus: "pending",
      paidAmount: 0,
      balanceAmount: 854,
      status: "confirmed",
      priority: "medium",
      notes: "Test bill created for Sanity real-time demo",
    };

    await createBill(testBill);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Sanity Real-time Bills
            <SanityRealtimeStatus />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full sm:h-8 sm:w-8 h-6 w-6  border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sanity Real-time Bills ({bills.length})
          <div className="flex items-center gap-4">
            <Button
              onClick={createTestBill}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Test Bill
            </Button>
            <SanityRealtimeStatus />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No bills found. Create a new bill to see Sanity real-time updates!
            </div>
          ) : (
            bills.map((bill) => (
              <div
                key={bill._id || bill.billId}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{bill.billNumber}</h3>
                      <Badge className={getStatusColor(bill.status)}>
                        {bill.status}
                      </Badge>
                      <Badge
                        className={getPaymentStatusColor(bill.paymentStatus)}
                      >
                        {bill.paymentStatus}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Service:</strong> {bill.serviceType}
                      </p>
                      <p>
                        <strong>Location:</strong> {bill.locationType}
                      </p>
                      <p>
                        <strong>Items:</strong> {bill.items?.length || 0} items
                      </p>
                      <p>
                        <strong>Total:</strong> ₹{bill.totalAmount}
                      </p>
                      {bill.paidAmount > 0 && (
                        <p>
                          <strong>Paid:</strong> ₹{bill.paidAmount}
                        </p>
                      )}
                      {bill.balanceAmount > 0 && (
                        <p>
                          <strong>Balance:</strong> ₹{bill.balanceAmount}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-500">
                    <p>
                      Created {formatDistanceToNow(new Date(bill.createdAt))}{" "}
                      ago
                    </p>
                    {bill.updatedAt !== bill.createdAt && (
                      <p>
                        Updated {formatDistanceToNow(new Date(bill.updatedAt))}{" "}
                        ago
                      </p>
                    )}
                  </div>
                </div>

                {bill.items && bill.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <h4 className="text-sm font-medium mb-2">Items:</h4>
                    <div className="space-y-1">
                      {bill.items.slice(0, 3).map((item, index) => (
                        <div
                          key={index}
                          className="text-sm text-gray-600 flex justify-between"
                        >
                          <span>
                            {item.productName} x{item.quantity}
                          </span>
                          <span>₹{item.totalPrice}</span>
                        </div>
                      ))}
                      {bill.items.length > 3 && (
                        <p className="text-sm text-gray-500">
                          +{bill.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
