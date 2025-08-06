/**
 * Utility functions for formatting numbers, currency, and percentages
 */

export const formatCurrency = (
  amount: number,
  currency: string = "₹"
): string => {
  return `${currency}${Math.round(amount).toLocaleString()}`;
};

export const formatPercentage = (
  value: number,
  decimals: number = 1
): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (value: number): string => {
  return Math.round(value).toLocaleString();
};

export const formatTrendValue = (
  value: number,
  suffix: string = "%"
): string => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${suffix}`;
};

export const getTrendDirection = (value: number): "up" | "down" => {
  return value >= 0 ? "up" : "down";
};

export const formatDateRange = (dateRange: string): string => {
  switch (dateRange) {
    case "week":
      return "This Week";
    case "month":
      return "This Month";
    case "quarter":
      return "This Quarter";
    case "year":
      return "This Year";
    default:
      return "All Time";
  }
};
