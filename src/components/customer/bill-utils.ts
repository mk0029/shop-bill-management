export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "paid":
      return "bg-green-900 text-green-300 border-green-700";
    case "partial":
      return "bg-orange-500 text-white border-orange-700";
    case "pending":
      return "bg-yellow-800 text-yellow-300 border-yellow-700";
    case "overdue":
      return "bg-red-900 text-red-300 border-red-700";
    default:
      return "bg-gray-900 text-gray-300 border-gray-700";
  }
};
