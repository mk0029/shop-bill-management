// Inventory Data Helper File
// Contains helper functions and utilities for inventory management
// Data now comes from Sanity CMS and Zustand stores

import { useCategoryStore } from "@/store/category-store";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useBrandStore } from "@/store/brand-store";

export const currency = "₹";

// Helper function to get categories as dropdown options
export const getItemCategories = () => {
  const { getActiveCategories } = useCategoryStore.getState();
  const categories = getActiveCategories();

  return categories.map((category) => ({
    value: category.name.toLowerCase(),
    label: category.name,
  }));
};

// Helper function to get light types
export const getLightTypes = () => {
  const { getOptionsByCategory } = useSpecificationsStore.getState();
  return getOptionsByCategory("light", "lightType");
};

// Helper function to get colors for a category
export const getColors = (category: string = "light") => {
  const { getOptionsByCategory } = useSpecificationsStore.getState();
  return getOptionsByCategory(category, "color");
};

// Helper function to get sizes for a category
export const getSizes = (category: string = "light") => {
  const { getOptionsByCategory } = useSpecificationsStore.getState();
  return getOptionsByCategory(category, "size");
};

// Helper function to get wire gauges
export const getWireGauges = () => {
  const { getOptionsByCategory } = useSpecificationsStore.getState();
  return getOptionsByCategory("wire", "wireGauge");
};

// Helper function to get ampere ratings
export const getAmpereRatings = (category: string = "switch") => {
  const { getOptionsByCategory } = useSpecificationsStore.getState();
  return getOptionsByCategory(category, "amperage");
};

// Helper function to get units
export const getUnits = () => {
  const { unitOptions } = useSpecificationsStore.getState();
  return unitOptions;
};

// Backward compatibility exports (using functions instead of static arrays)
export const itemCategories = getItemCategories();
export const lightTypes = getLightTypes();
export const colors = getColors();
export const sizes = getSizes();
export const wireGauges = getWireGauges();
export const ampereRatings = getAmpereRatings();
export const units = getUnits();

// Service type options for bills
export const serviceTypes = [
  { value: "repair", label: "Repair" },
  { value: "sale", label: "Sale" },
  { value: "installation", label: "Installation" },
  { value: "maintenance", label: "Maintenance" },
  { value: "custom", label: "Custom" },
];

// Location type options for bills
export const locationTypes = [
  { value: "shop", label: "Shop" },
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
];

// Payment status options
export const paymentStatuses = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

// Bill status options
export const billStatuses = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Priority levels
export const priorityLevels = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

// Payment methods
export const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
];

// Stock transaction types
export const stockTransactionTypes = [
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sale" },
  { value: "adjustment", label: "Adjustment" },
  { value: "return", label: "Return" },
  { value: "damage", label: "Damage" },
];

// Helper function to format currency
export const formatCurrency = (amount: number) => {
  return `${currency}${amount.toLocaleString("en-IN")}`;
};

// Helper function to format specifications
export const formatSpecifications = (specs: any) => {
  const formatted = [];

  if (specs.lightType) formatted.push(`Type: ${specs.lightType}`);
  if (specs.color) formatted.push(`Color: ${specs.color}`);
  if (specs.size) formatted.push(`Size: ${specs.size}`);
  if (specs.wattage) formatted.push(`${specs.wattage}W`);
  if (specs.wireGauge) formatted.push(`Gauge: ${specs.wireGauge}`);
  if (specs.amperage) formatted.push(`${specs.amperage}`);
  if (specs.voltage) formatted.push(`${specs.voltage}`);
  if (specs.material) formatted.push(`Material: ${specs.material}`);

  return formatted.join(", ");
};

// Helper function to get stock status
export const getStockStatus = (currentStock: number, minimumStock: number) => {
  if (currentStock <= 0)
    return { status: "out_of_stock", label: "Out of Stock", color: "red" };
  if (currentStock <= minimumStock)
    return { status: "low_stock", label: "Low Stock", color: "yellow" };
  return { status: "in_stock", label: "In Stock", color: "green" };
};

// Helper function to calculate profit margin
export const calculateProfitMargin = (
  sellingPrice: number,
  purchasePrice: number
) => {
  if (purchasePrice === 0) return 0;
  return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
};

// Legacy helper functions for backward compatibility
export const getCategoryLabel = (category: string) => {
  const categories = getItemCategories();
  const found = categories.find((cat) => cat.value === category);
  return found ? found.label : category;
};

export const getLightTypeLabel = (lightType: string) => {
  const { getOptionLabel } = useSpecificationsStore.getState();
  return getOptionLabel(lightType, "lightType");
};

export const getUnitLabel = (unit: string) => {
  const { getOptionLabel } = useSpecificationsStore.getState();
  return getOptionLabel(unit, "unit");
};

export const getItemSpecifications = (formData: any) => {
  const specs = [];

  if (formData.lightType) specs.push(`Type: ${formData.lightType}`);
  if (formData.color) specs.push(`Color: ${formData.color}`);
  if (formData.size) specs.push(`Size: ${formData.size}`);
  if (formData.watts) specs.push(`Watts: ${formData.watts}W`);
  if (formData.wireGauge) specs.push(`Gauge: ${formData.wireGauge}`);
  if (formData.ampere) specs.push(`Ampere: ${formData.ampere}`);

  return specs.join(", ");
};

// Helper function to safely get product brand name
export const getProductBrandName = (product: any) => {
  return product?.brand?.name || "No Brand";
};

// Helper function to safely get product category name
export const getProductCategoryName = (product: any) => {
  return product?.category?.name || "No Category";
};

// Helper function to safely get product display info
export const getProductDisplayInfo = (product: any) => {
  return {
    name: product?.name || "Unnamed Product",
    brandName: getProductBrandName(product),
    categoryName: getProductCategoryName(product),
    price: product?.pricing?.sellingPrice || 0,
    stock: product?.inventory?.currentStock || 0,
    isActive: product?.isActive || false,
  };
};
