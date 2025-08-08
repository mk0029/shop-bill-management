import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, FileText, Download, X } from "lucide-react";

interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  currency: string;
  getBillStatusColor: (status: string) => string;
  getTotalAmount: (bill: any) => number;
  getServiceTypeLabel: (serviceType: string) => string;
  onDownloadBill: (bill: any) => void;
}

export const BillDetailModal = ({
  isOpen,
  onClose,
  bill,
  currency,
  getBillStatusColor,
  getTotalAmount,
  getServiceTypeLabel,
  onDownloadBill,
}: BillDetailModalProps) => {
  if (!bill) return null;

  const itemsTotal =
    bill.items?.reduce(
      (total: number, item: any) => total + (item.totalPrice || 0),
      0
    ) || 0;

  const additionalCharges =
    (bill.homeVisitFee || 0) +
    (bill.repairCharges || 0) +
    (bill.laborCharges || 0);

  const grandTotal = itemsTotal + additionalCharges;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bill Details" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Bill #{bill.billNumber || bill.billId}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(bill.billDate).toLocaleDateString()}
              </div>
              {bill.serviceType && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {getServiceTypeLabel(bill.serviceType)}
                </div>
              )}
              {bill.locationType && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {bill.locationType}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 text-sm font-medium rounded ${getBillStatusColor(
                bill.status
              )}`}>
              {bill.status?.toUpperCase() || "UNKNOWN"}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        {bill.customer && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">
              Customer Information
            </h3>
            <div className="text-sm text-gray-300">
              <p>{bill.customer.name}</p>
              {bill.customerAddress && (
                <p className="text-gray-400">
                  {bill.customerAddress.addressLine1}
                  {bill.customerAddress.city &&
                    `, ${bill.customerAddress.city}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        {bill.items && bill.items.length > 0 && (
          <div>
            <h3 className="font-medium text-white mb-3">Items</h3>
            <div className="space-y-2">
              {bill.items.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {item.product?.name || "Unknown Item"}
                    </p>
                    {item.description && (
                      <p className="text-sm text-gray-400">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span>Qty: {item.quantity}</span>
                      <span>
                        Unit Price: {currency}
                        {item.unitPrice?.toFixed(2) || "0.00"}
                      </span>
                      {item.discount > 0 && (
                        <span className="text-green-400">
                          Discount: {currency}
                          {item.discount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">
                      {currency}
                      {item.totalPrice?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bill Summary */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium text-white mb-3">Bill Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Items Subtotal</span>
              <span className="text-white">
                {currency}
                {itemsTotal.toFixed(2)}
              </span>
            </div>

            {bill.homeVisitFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Home Visit Fee</span>
                <span className="text-white">
                  {currency}
                  {bill.homeVisitFee.toFixed(2)}
                </span>
              </div>
            )}

            {bill.repairCharges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Repair Charges</span>
                <span className="text-white">
                  {currency}
                  {bill.repairCharges.toFixed(2)}
                </span>
              </div>
            )}

            {bill.laborCharges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Labor Charges</span>
                <span className="text-white">
                  {currency}
                  {bill.laborCharges.toFixed(2)}
                </span>
              </div>
            )}

            <div className="border-t border-gray-700 pt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-white">Total Amount</span>
                <span className="text-blue-400 text-lg">
                  {currency}
                  {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {bill.notes && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Notes</h3>
            <p className="text-gray-300 text-sm">{bill.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => onDownloadBill(bill)}
            className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};
