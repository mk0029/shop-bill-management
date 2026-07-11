import { Plus, Users, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomersPageHeaderProps {
  onAddCustomer: () => void;
  onOpenRequests: () => void;
  pendingRequestsCount: number;
}

export default function CustomersPageHeader({
  onAddCustomer,
  onOpenRequests,
  pendingRequestsCount,
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
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenRequests}
          className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border border-white/10 text-[#B8C0CC] hover:text-white hover:border-sky-400/30 transition-all bg-white/[0.03]"
        >
          <ClipboardList className="w-4 h-4" />
          <span className="max-sm:hidden">Registration Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-sky-500/20 text-sky-400 text-xs font-semibold px-1.5">
              {pendingRequestsCount}
            </span>
          )}
        </button>
        <Button size="sm" onClick={onAddCustomer} className="shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="max-sm:hidden">Add Customer</span>
        </Button>
      </div>
    </div>
  );
}
