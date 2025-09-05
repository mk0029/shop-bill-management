import { Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import CustomerTableRow from "./customer-table-row";
import type { CustomerWithStats } from "@/types/customer";

interface CustomerTableProps {
  customers: CustomerWithStats[];
  isLoading: boolean;
  searchTerm: string;
  onViewCustomer: (customer: CustomerWithStats) => void;
  onEditCustomer?: (customer: CustomerWithStats) => void;
  onDeleteCustomer: (customerId: string) => void;
}

export default function CustomerTable({
  customers,
  isLoading,
  searchTerm,
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
}: CustomerTableProps) {
  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <div className="p-3 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Customers</h2>
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading customers...</span>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-6 w-6 sm:w-8 sm:h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading customer data...</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <div className="p-3 md:p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Customers</h2>
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No customers found</p>
            <p className="text-sm text-gray-500">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Add your first customer to get started"}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <div className="p-3 md:p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Customers</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-300 font-medium">
                  Customer
                </th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium max-sm:hidden">
                  Contact
                </th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium max-sm:hidden">
                  Activity
                </th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium max-sm:hidden">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <CustomerTableRow
                  key={customer._id}
                  customer={customer}
                  index={index}
                  onView={onViewCustomer}
                  onEdit={onEditCustomer}
                  onDelete={onDeleteCustomer}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
