import {
  Receipt,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface BillsHistoryHeaderProps {
  stats: {
    totalBills: number;
    paidBills: number;
    pendingBills: number;
    overdueBills: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
  currency: string;
}

export const BillsHistoryHeader = ({
  stats,
  currency,
}: BillsHistoryHeaderProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
          Bills History
        </h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
          Complete history of your bills and payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Bills</p>
              <p className="text-xl font-semibold text-white">
                {stats.totalBills}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Paid Bills</p>
              <p className="text-xl font-semibold text-white">
                {stats.paidBills}
              </p>
              <p className="text-xs text-green-400">
                {currency}
                {stats.paidAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-600/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Bills</p>
              <p className="text-xl font-semibold text-white">
                {stats.pendingBills}
              </p>
              <p className="text-xs text-yellow-400">
                {currency}
                {stats.pendingAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Overdue Bills</p>
              <p className="text-xl font-semibold text-white">
                {stats.overdueBills}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Total Amount
            </h3>
            <p className="text-3xl font-bold text-blue-400">
              {currency}
              {stats.totalAmount.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                Paid: {currency}
                {stats.paidAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-yellow-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Pending: {currency}
                {stats.pendingAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
