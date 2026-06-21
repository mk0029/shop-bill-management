import { Users, Loader2, SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import CustomerTableRow from "./customer-table-row";
import type { CustomerWithStats } from "@/types/customer";
import { motion } from "framer-motion";

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
      <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Customers</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
              <p className="text-gray-400 text-sm">Loading customer data...</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Customers</h2>
          <div className="text-center py-16">
            {searchTerm ? (
              <>
                <SearchX className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No customers found</p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search terms
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 mb-2">No customers yet</p>
                <p className="text-sm text-gray-500">
                  Add your first customer to get started
                </p>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm max-h-[75vh] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Customers</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
              {customers.length} total
            </span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="hidden sm:table-header-group">
            <tr className="border-b border-gray-800/50">
              <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium uppercase tracking-wider text-gray-500">
                Customer
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-gray-500">
                Activity
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-gray-500">
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
    </Card>
  );
}
