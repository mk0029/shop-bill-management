"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { Customer } from "../types";

interface SharePopupProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomerId: string;
  onCustomerChange: (id: string) => void;
  onShareClick: () => void;
}

export default function SharePopup({
  isOpen,
  onClose,
  customers,
  selectedCustomerId,
  onCustomerChange,
  onShareClick,
}: SharePopupProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Quotation"
      size="md"
      className=""
    >
      <div className="flex flex-col justify-between min-h-[200px]">
        <div>
          <Label className="text-gray-200">Select Customer</Label>
          <CustomerAutocomplete
            customers={customers}
            value={selectedCustomerId}
            onChange={onCustomerChange}
            placeholder="Type customer name"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            disabled={!selectedCustomerId}
            onClick={onShareClick}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Share
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
