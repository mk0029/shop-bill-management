"use client";

import { Badge } from "@/components/ui/badge";

interface BillItemsProps {
  bill: any;
  currency: string;
}

export const BillItems = ({ bill, currency }: BillItemsProps) => {
  if (!bill.items || bill.items.length === 0) {
    return null;
  }

  const formatSpecifications = (specifications: any) => {
    return Object.entries(specifications || {})
      .filter(
        ([_, value]) => value !== undefined && value !== null && value !== "",
      )
      .map(([key, value]) => {
        // 1️⃣ Format camelCase / PascalCase into spaced words
        let formattedKey = key.replace(/([a-z])([A-Z])/g, "$1 $2");

        // 2️⃣ Split into words, remove "is", capitalize each
        formattedKey = formattedKey
          .split(" ")
          .filter((word) => word.toLowerCase() !== "is")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // 3️⃣ Convert boolean strings to Yes/No
        if (String(value).toLowerCase() === "true") value = "Yes";
        else if (String(value).toLowerCase() === "false") value = "No";

        return `${formattedKey}: ${value}`;
      })
      .join(", ");
  };

  return (
    <div>
      <h3 className="font-medium text-white mb-2 sm:mb-3 md:mb-4">Items</h3>
      <div className="space-y-3">
        {bill.items.map((item: any, index: number) => (
          <div
            key={index}
            className="p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 ">
              <div className="flex-1">
                <div className="flex items-center gap-2 justify-between flex-wrap">
                  <p className="font-medium text-white mb-1">
                    {item?.product?.name || item.name || "Unknown Item"} |{" "}
                    {item.category && (
                      <Badge
                        variant="outline"
                        className="text-purple-400 border-purple-600 max-sm:!py-0.5 max-sm:px-2 max-sm:text-xs"
                      >
                        {item.category}
                      </Badge>
                    )}
                  </p>
                </div>

                {item.specifications && (
                  <p className="text-sm text-gray-400 mb-2">
                    {typeof item.specifications === "object"
                      ? formatSpecifications(item.specifications)
                      : String(item.specifications)}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-400">
                  <span>
                    Qty: {item.quantity} {item.unit || "piece"}
                  </span>
                  <span>
                    Unit Price: {currency}
                    {(item.unitPrice || item.price || 0).toFixed(2)}
                  </span>
                  {item.discount > 0 && (
                    <span className="text-green-400">
                      Discount: {currency}
                      {item.discount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-white text-base md:text-lg">
                  {currency}
                  {(item.totalPrice || item.total || 0).toFixed(2)}
                </p>
              </div>
            </div>
            {item.productDetails && (
              <p className="text-sm text-gray-200 capitalize ">
                {formatSpecifications(item.productDetails.specifications)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
