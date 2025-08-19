import { motion } from "framer-motion";
import { Eye, Edit, Trash2, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocaleStore } from "@/store/locale-store";
import {
  getCustomerInitials,
  getCustomerStatusColor,
  formatCustomerActivity,
  formatLastBillDate,
} from "@/lib/customer-utils";
import type { CustomerWithStats } from "@/types/customer";

interface CustomerTableRowProps {
  customer: CustomerWithStats;
  index: number;
  onView: (customer: CustomerWithStats) => void;
  onEdit?: (customer: CustomerWithStats) => void;
  onDelete: (customerId: string) => void;
}

export default function CustomerTableRow({
  customer,
  index,
  onView,
  onEdit,
  onDelete,
}: CustomerTableRowProps) {
  const { currency } = useLocaleStore();
  const statusColors = getCustomerStatusColor(customer.isActive);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="border-b border-gray-800 hover:bg-gray-800/50">
      <td className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {getCustomerInitials(customer.name)}
            </span>
          </div>
          <div>
            <p className="text-white font-medium">{customer.name}</p>
            <p className="text-gray-400 text-sm">ID: {customer.customerId}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 max-sm:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-white">{customer.phone}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">@</span>
              <span className="text-gray-400">{customer.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">{customer.location}</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 max-sm:hidden">
        <div className="space-y-1">
          <p className="text-white text-sm">
            {formatCustomerActivity(customer, currency)}
          </p>
          <p className="text-gray-400 text-xs">
            {formatLastBillDate(customer.lastBillDate)}
          </p>
        </div>
      </td>
      <td className="py-4 px-4 max-sm:hidden">
        <span
          className={`px-2 py-1 rounded-full text-xs ${statusColors.bg} ${statusColors.text}`}>
          {customer.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(customer)}
            className="hover:bg-gray-800">
            <Eye className="w-4 h-4" />
          </Button>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(customer)}
              className="hover:bg-gray-800 max-sm:hidden">
              <Edit className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(customer._id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}
