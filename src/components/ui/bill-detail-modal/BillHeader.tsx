"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, MapPin } from "lucide-react";

interface BillHeaderProps {
  bill: any;
  getStatusColor: (status: string) => string;
  formatDate: (dateString: string) => string;
}

export const BillHeader = ({ bill, getStatusColor, formatDate }: BillHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex-1">
        <h2 className="text-base sm:text-base md:text-lg lg:text-2xl xl:text-3xl font-bold text-white mb-3 text-ellipsis max-sm:max-w-[78%] max-w-full whitespace-nowrap overflow-hidden">
          Bill #{bill.billNumber || bill._id}
        </h2>

        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              Date: {formatDate(bill.serviceDate || bill.createdAt)}
            </span>
          </div>

          {bill.serviceType && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="capitalize">Service: {bill.serviceType.replace(/_/g, " ")}</span>
            </div>
          )}

          {bill.locationType && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="capitalize">Location: {bill.locationType==="shop" ? "Shop" : "Not At Shop"}</span>
            </div>
          )}
          
          {bill.technician?.name && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>
                Technician: {bill.technician.name}
                {bill.technician?.phone && (
                  <>
                    &nbsp; | &nbsp;Call :-&nbsp;
                    <a
                      href={`tel:${bill.technician.phone}`}
                      className="text-blue-400 hover:underline"
                    >
                      {bill.technician.phone}
                    </a>
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      <Badge
        className={`${getStatusColor(bill.paymentStatus || bill.status)} px-2 py-0.5 text-xs font-medium max-sm:absolute max-sm:-right-1 max-sm:top-0 z-10`}
      >
        {(bill.paymentStatus || bill.status || "pending").toUpperCase()}
      </Badge>
    </div>
  );
};
