import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomersPageHeaderProps {
  onAddCustomer: () => void;
}

export default function CustomersPageHeader({
  onAddCustomer,
}: CustomersPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
          Customer Management
        </h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
          Manage customer accounts and view their activity
        </p>
      </div>
      <Button size="sm" onClick={onAddCustomer}>
        <Plus className="w-4 h-4 mr-1 sm:mr-2" />
        Add <span className="max-sm:hidden">Customer</span>
      </Button>
    </div>
  );
}
