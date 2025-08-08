"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { Card } from "./card";
import {
  CheckCircle,
  Copy,
  CheckCircle2,
  X,
  User,
  Package,
  FileText,
} from "lucide-react";

export interface SuccessPopupData {
  title: string;
  message: string;
  type: "customer" | "product" | "bill" | "general";
  details?: Array<{
    label: string;
    value: string;
    copyable?: boolean;
  }>;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: "default" | "outline" | "destructive";
  }>;
  onReset?: () => void;
}

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  data: SuccessPopupData;
  autoClose?: number; // Auto close after X milliseconds
}

export function SuccessPopup({
  isOpen,
  onClose,
  data,
  autoClose,
}: SuccessPopupProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case "customer":
        return <User className="w-16 h-16 text-green-500" />;
      case "product":
        return <Package className="w-16 h-16 text-green-500" />;
      case "bill":
        return <FileText className="w-16 h-16 text-green-500" />;
      default:
        return <CheckCircle className="w-16 h-16 text-green-500" />;
    }
  };

  const handleCreateAnother = () => {
    // Reset form if reset function is provided
    if (data.onReset) {
      data.onReset();
    }
    onClose();
  };

  const handleDone = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md">
              <Card className="bg-gray-900 border-green-500/30 border shadow-2xl">
                <div className="p-4 md:p-6">
                  {/* Close Button */}
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="hover:bg-gray-800 p-1">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Icon and Title */}
                  <div className="text-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="flex justify-center mb-4">
                      {getIcon()}
                    </motion.div>

                    <h2 className="text-xl font-bold text-green-200 mb-2">
                      {data.title}
                    </h2>

                    <p className="text-gray-300 text-sm">{data.message}</p>
                  </div>

                  {/* Details */}
                  {data.details && data.details.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {data.details.map((detail, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div>
                            <p className="text-gray-400 text-xs">
                              {detail.label}
                            </p>
                            <p className="text-white font-medium">
                              {detail.value}
                            </p>
                          </div>

                          {detail.copyable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(detail.value, detail.label)
                              }
                              className="hover:bg-gray-700 p-2">
                              {copiedField === detail.label ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    {data.actions && data.actions.length > 0 ? (
                      data.actions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.variant || "default"}
                          onClick={action.action}
                          className="flex-1">
                          {action.label}
                        </Button>
                      ))
                    ) : (
                      <>
                        <Button
                          onClick={handleCreateAnother}
                          variant="outline"
                          className="flex-1">
                          Create Another
                        </Button>
                        <Button onClick={handleDone} className="flex-1">
                          Done
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Auto close indicator */}
                  {autoClose && (
                    <div className="mt-4 text-center">
                      <p className="text-gray-400 text-xs">
                        This popup will close automatically in{" "}
                        {Math.ceil(autoClose / 1000)} seconds
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Predefined success popups for common scenarios
export const createCustomerSuccessPopup = (
  customerData: any,
  onReset?: () => void
): SuccessPopupData => ({
  title: "Customer Created Successfully!",
  message: "The customer has been successfully added to your system.",
  type: "customer",
  details: [
    {
      label: "Customer Name",
      value: customerData.name,
    },
    {
      label: "Phone Number",
      value: customerData.phone,
    },
    {
      label: "Customer ID",
      value: customerData.customerId,
      copyable: true,
    },
    {
      label: "Secret Key",
      value: customerData.secretKey,
      copyable: true,
    },
  ],
  onReset,
});

export const createProductSuccessPopup = (
  productData: any,
  onReset?: () => void,
  isUpdate: boolean = false
): SuccessPopupData => ({
  title: isUpdate
    ? "Product Updated Successfully!"
    : "Product Added Successfully!",
  message: isUpdate
    ? "The existing product has been updated with new stock and latest pricing."
    : "The product has been successfully added to your inventory.",
  type: "product",
  details: [
    {
      label: "Product Name",
      value: productData.name,
    },
    {
      label: "Category",
      value:
        typeof productData.category === "string"
          ? productData.category
          : productData.category?.name || "N/A",
    },
    {
      label: "Brand",
      value:
        typeof productData.brand === "string"
          ? productData.brand
          : productData.brand?.name || "N/A",
    },
    {
      label: isUpdate ? "Updated Selling Price" : "Selling Price",
      value: `₹${
        productData.pricing?.sellingPrice || productData.sellingPrice || 0
      }`,
    },
    {
      label: isUpdate ? "Total Stock" : "Current Stock",
      value: `${
        productData.inventory?.currentStock || productData.currentStock || 0
      } ${productData.pricing?.unit || productData.unit || "pcs"}`,
    },
    ...(isUpdate
      ? [
          {
            label: "Status",
            value: "Stock increased with latest price applied to all items",
          },
        ]
      : []),
  ],
  onReset,
});

export const createBillSuccessPopup = (
  billData: any,
  onReset?: () => void
): SuccessPopupData => ({
  title: "Bill Created Successfully!",
  message: "The bill has been successfully generated and saved.",
  type: "bill",
  details: [
    {
      label: "Bill Number",
      value: billData.billNumber,
      copyable: true,
    },
    {
      label: "Customer",
      value: billData.customerName,
    },
    {
      label: "Total Amount",
      value: `₹${billData.totalAmount}`,
    },
    {
      label: "Items",
      value: `${billData.itemsCount} items`,
    },
  ],
  onReset,
}); 