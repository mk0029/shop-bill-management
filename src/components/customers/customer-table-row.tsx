import { Button } from "@/components/ui/button";
import {
  formatCustomerActivity,
  formatLastBillDate,
  getCustomerStatusColor,
} from "@/lib/customer-utils";
import { useLocaleStore } from "@/store/locale-store";
import type { CustomerWithStats } from "@/types/customer";
import { motion } from "framer-motion";
import { Eye, MapPin, Phone, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { safeInitial, safeUserName } from "@/lib/display-text";

interface CustomerTableRowProps {
  customer: CustomerWithStats;
  index: number;
  onView: (customer: CustomerWithStats) => void;
  onEdit?: (customer: CustomerWithStats) => void;
  onDelete: (customerId: string) => void;
}

const avatarGradients = [
  "from-blue-600 to-blue-400",
  "from-emerald-600 to-emerald-400",
  "from-purple-600 to-purple-400",
  "from-amber-600 to-amber-400",
  "from-rose-600 to-rose-400",
  "from-cyan-600 to-cyan-400",
  "from-violet-600 to-violet-400",
  "from-pink-600 to-pink-400",
];

export default function CustomerTableRow({
  customer,
  index,
  onView,
  onEdit,
  onDelete,
}: CustomerTableRowProps) {
  const { currency } = useLocaleStore();
  const statusColors = getCustomerStatusColor(customer.isActive);
  const [isMobile, setIsMobile] = useState(true);
  const customerDisplayName = safeUserName(customer.name, "Customer");
  const gradient = avatarGradients[index % avatarGradients.length];

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activity = formatCustomerActivity(customer, currency);
  const hasPending = activity !== "All Paid";

  return (
    <motion.tr
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => { if (window.innerWidth <= 640) return onView(customer); }}
      className="group border-b border-gray-800/40 hover:bg-white/[0.02] cursor-pointer sm:cursor-default transition-colors"
    >
      <td className="py-3 px-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
            <span className="text-white font-semibold text-xs sm:text-sm">
              {safeInitial(customer.name)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-medium text-white truncate">
              {customerDisplayName}
            </p>
            {isMobile && (
              <div className="flex items-center gap-2 mt-0.5">
                {hasPending && (
                  <span className="text-xs text-amber-400 font-medium">
                    {activity}
                  </span>
                )}
                {!isMobile && customer.location && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {customer.location}
                  </span>
                )}
              </div>
            )}
          </div>
          {isMobile && <ChevronRight className="w-4 h-4 text-gray-600" />}
        </div>
      </td>

      {!isMobile && (
        <td className="py-3 px-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-gray-300">{customer.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-gray-400 truncate max-w-[160px]">{customer.location}</span>
            </div>
          </div>
        </td>
      )}

      {!isMobile && (
        <td className="py-3 px-4">
          <div className="space-y-1">
            <p className={`text-sm font-medium ${hasPending ? "text-amber-400" : "text-emerald-400"}`}>
              {activity}
            </p>
            <p className="text-xs text-gray-500">
              {formatLastBillDate(customer.lastBillDate)}
            </p>
          </div>
        </td>
      )}

      {!isMobile && (
        <td className="py-3 px-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${customer.isActive ? "bg-emerald-400" : "bg-gray-400"}`} />
            {customer.isActive ? "Active" : "Inactive"}
          </span>
        </td>
      )}

      {!isMobile && (
        <td className="py-3 px-4">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onView(customer); }}
              className="hover:bg-gray-800 text-gray-400 hover:text-white text-xs gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </Button>
          </div>
        </td>
      )}
    </motion.tr>
  );
}
