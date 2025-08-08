import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  MapPin,
  Eye,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface BillsListProps {
  bills: any[];
  isLoading: boolean;
  error: any;
  currency: string;
  onViewBill: (bill: any) => void;
  onDownloadBill: (bill: any) => void;
  getBillStatusColor: (status: string) => string;
  getTotalAmount: (bill: any) => number;
  getServiceTypeLabel: (serviceType: string) => string;
}

export const BillsList = ({
  bills,
  isLoading,
  error,
  currency,
  onViewBill,
  onDownloadBill,
  getBillStatusColor,
  getTotalAmount,
  getServiceTypeLabel,
}: BillsListProps) => {
  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-400">Loading your bills...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Error Loading Bills
            </h3>
            <p className="text-gray-400">
              {error.message || "Failed to load bills"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bills.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-8">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No Bills Found
            </h3>
            <p className="text-gray-400">
              You don't have any bills yet or try adjusting your search.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bills.map((bill, index) => (
        <motion.div
          key={bill._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}>
          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      Bill #{bill.billNumber || bill.billId}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getBillStatusColor(
                        bill.status
                      )}`}>
                      {bill.status?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
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

                  {/* Items Preview */}
                  {bill.items && bill.items.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-400 mb-1">Items:</p>
                      <div className="flex flex-wrap gap-2">
                        {bill.items
                          .slice(0, 3)
                          .map((item: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">
                              {item.product?.name || "Unknown Item"} x
                              {item.quantity}
                            </span>
                          ))}
                        {bill.items.length > 3 && (
                          <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded">
                            +{bill.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-white mb-2">
                    {currency}
                    {getTotalAmount(bill).toFixed(2)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewBill(bill)}
                      className="text-blue-400 border-blue-400 hover:bg-blue-400/10">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownloadBill(bill)}
                      className="text-green-400 border-green-400 hover:bg-green-400/10">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Additional charges */}
              {(bill.homeVisitFee > 0 ||
                bill.repairCharges > 0 ||
                bill.laborCharges > 0) && (
                <div className="border-t border-gray-800 pt-3">
                  <p className="text-sm text-gray-400 mb-2">
                    Additional Charges:
                  </p>
                  <div className="flex gap-4 text-sm">
                    {bill.homeVisitFee > 0 && (
                      <span className="text-gray-300">
                        Home Visit: {currency}
                        {bill.homeVisitFee}
                      </span>
                    )}
                    {bill.repairCharges > 0 && (
                      <span className="text-gray-300">
                        Repair: {currency}
                        {bill.repairCharges}
                      </span>
                    )}
                    {bill.laborCharges > 0 && (
                      <span className="text-gray-300">
                        Labor: {currency}
                        {bill.laborCharges}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
