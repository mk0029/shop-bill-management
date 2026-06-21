import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomersPageHeaderProps {
  onAddCustomer: () => void;
}

export default function CustomersPageHeader({
  onAddCustomer,
}: CustomersPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Customers
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
            Manage and view all registered customers
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onAddCustomer} className="shadow-lg shadow-blue-600/20">
        <Plus className="w-4 h-4 sm:mr-2" />
        <span className="max-sm:hidden">Add Customer</span>
      </Button>
    </div>
  );
}
