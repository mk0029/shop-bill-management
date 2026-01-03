import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { BillPaymentSection } from "./bill-payment-section";

type SanityBill = any;

interface BillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBill: SanityBill | null;
  formatCurrency: (value: number) => string;
  getStatusColor: (status: string) => string;
}

export function BillDetailsModal({ 
  isOpen, 
  onClose, 
  selectedBill, 
  formatCurrency, 
  getStatusColor 
}: BillDetailsModalProps) {
  if (!selectedBill) return null;

  const currency = "₹";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`Bill #${selectedBill?.billNumber}`}>
      <div className="space-y-6 max-md:space-y-4">
        {/* Bill Info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between gap-3 flex-wrap">
            <h4 className="font-medium text-white">Bill Information</h4>
            <Badge
              className={`${getStatusColor(selectedBill.paymentStatus || selectedBill.status)} px-2 py-0.5 text-xs font-medium pointer-events-none`}>
              {(
                selectedBill.paymentStatus ||
                selectedBill.status ||
                "pending"
              ).toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <p className="text-gray-400">Service Type</p>
              <p className="text-white capitalize">
                {selectedBill.serviceType}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Location</p>
              <p className="text-white capitalize">
                {selectedBill.locationType}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Bill Number</p>
              <p className="text-white capitalize">
                {selectedBill.billNumber}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Bill Date</p>
              <p className="text-white capitalize">
                {selectedBill.serviceDate
                  ? new Date(selectedBill.serviceDate).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Bill Items */}
        {selectedBill.items && selectedBill.items.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-white mb-3">Bill Items</h4>
            <div className="space-y-3">
              {selectedBill.items.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white">
                        {item.productName || "Product"}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-purple-400 border-purple-600 max-sm:!py-0.5 max-sm:px-2 max-sm:text-xs">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">
                      {item.quantity} × ₹{item.unitPrice?.toLocaleString()}
                    </p>
                    {item.specifications && (
                      <p className="text-xs text-gray-500">
                        {item.specifications}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-white">
                    ₹{item.totalPrice?.toLocaleString() || "0"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charges & Totals */}
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
          <h4 className="font-medium text-white mb-3">Charges & Totals</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selectedBill.subtotal !== selectedBill.totalAmount && selectedBill?.subtotal && selectedBill?.subtotal > 0 && (
              <div>
                <p className="text-gray-400">Items Subtotal</p>
                <p className="text-white">
                  {currency}
                  {selectedBill.subtotal?.toLocaleString() || "-"}
                </p>
              </div>
            )}
            {selectedBill.homeVisitFee !== null &&
              selectedBill?.homeVisitFee > 0 && (
                <div>
                  <p className="text-gray-400">Home Visit Fee</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.homeVisitFee?.toLocaleString() || "-"}
                  </p>
                </div>
              )}
            {selectedBill?.repairFee !== null &&
              selectedBill?.repairFee > 0 && (
                <div>
                  <p className="text-gray-400">Repair Charges</p>
                  <p className="text-white">
                    {currency}
                    {(selectedBill as any).repairFee?.toLocaleString?.() ||
                      (
                        selectedBill as any
                      ).repairCharges?.toLocaleString?.() ||
                      "-"}
                  </p>
                </div>
              )}
            {selectedBill?.laborCharges !== null &&
              selectedBill?.laborCharges > 0 && (
                <div>
                  <p className="text-gray-400">Labor Charges</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.laborCharges?.toLocaleString() || "-"}
                  </p>
                </div>
              )}
            {selectedBill?.taxAmount !== null &&
              selectedBill?.taxAmount > 0 && (
                <div>
                  <p className="text-gray-400">Tax</p>
                  <p className="text-white">
                    {formatCurrency(selectedBill.taxAmount)}
                  </p>
                </div>
              )}
            {selectedBill?.discount !== null &&
              selectedBill?.discount > 0 && (
                <div>
                  <p className="text-gray-400">Discount</p>
                  <p className="text-white">
                    {formatCurrency(selectedBill.discount)}
                  </p>
                </div>
              )}
            <div>
              <p className="text-gray-400">Total</p>
              <p className="text-white font-bold text-base md:text-lg">
                {formatCurrency(selectedBill.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-green-400">Paid</p>
              <p className="text-green-500">
                {formatCurrency(selectedBill.paidAmount)}
              </p>
            </div>
            {(() => {
              const total = Number(selectedBill.totalAmount || 0) || 0;
              const discount = Number(selectedBill.discount || 0) || 0;
              const paid = Number(selectedBill.paidAmount || 0) || 0;
              const actualPayableAmount = Math.max(0, total - discount);
              const balance = Math.max(0, actualPayableAmount - paid);
              if (balance > 0) {
                return (
                  <div>
                    <p className="text-white font-medium">Pending</p>
                    <p className="text-yellow-300 text-xl font-bold">
                      {formatCurrency(balance)}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          {selectedBill.notes && (
            <div className="mt-4">
              <p className="text-gray-400">Notes</p>
              <p className="text-white">{selectedBill.notes}</p>
            </div>
          )}
        </div>

        {/* Payment Section */}
        <BillPaymentSection selectedBill={selectedBill} />
      </div>
    </Modal>
  );
}
