export const currency = "₹";

export function formatCurrency(value: number | string | undefined | null): string {
  const num = safeNumber(value);
  if (!Number.isFinite(num)) return `${currency}0.00`;
  return `${currency}${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function safeNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function calculatePurchasePrice(totalAmount: number, itemCount: number): number {
  if (itemCount <= 0 || totalAmount <= 0) return 0;
  const price = totalAmount / itemCount;
  return Number.isFinite(price) ? price : 0;
}

export function calculateProfit(sellingPrice: number, purchasePrice: number): number {
  const profit = sellingPrice - purchasePrice;
  return Number.isFinite(profit) ? profit : 0;
}

export function calculateMargin(sellingPrice: number, purchasePrice: number): number | null {
  if (purchasePrice <= 0) return null;
  const margin = ((sellingPrice - purchasePrice) / purchasePrice) * 100;
  return Number.isFinite(margin) ? margin : null;
}

export function getStockStatus(currentStock: number, minimumStock: number): { label: string; variant: "success" | "warning" | "destructive" | "default"; dot: string } {
  if (currentStock <= 0) return { label: "Out of Stock", variant: "destructive", dot: "bg-red-400" };
  if (currentStock <= minimumStock) return { label: "Low Stock", variant: "warning", dot: "bg-amber-400" };
  return { label: "In Stock", variant: "success", dot: "bg-emerald-400" };
}

export function getStepFields(step: number): string[] {
  switch (step) {
    case 1: return ["productName", "category", "brand", "unit"];
    case 2: return ["sellingPrice"];
    case 3: return ["currentStock"];
    case 4: return [];
    default: return [];
  }
}

export function validateProductStep(formData: Record<string, any>, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  const fields = getStepFields(step);

  for (const field of fields) {
    const value = formData[field]?.toString().trim() ?? "";
    switch (field) {
      case "productName":
        if (!value) errors.productName = "Product name is required.";
        else if (value.length < 2) errors.productName = "Product name must be at least 2 characters.";
        break;
      case "category":
        if (!value) errors.category = "Please select a category.";
        break;
      case "brand":
        if (!value) errors.brand = "Please select a brand.";
        break;
      case "unit":
        if (!value) errors.unit = "Please select a unit.";
        break;
      case "sellingPrice": {
        const price = safeNumber(value);
        if (price <= 0) errors.sellingPrice = "Selling price is required for billing.";
        break;
      }
      case "currentStock": {
        const stock = safeNumber(value);
        if (stock < 0) errors.currentStock = "Current stock is required.";
        break;
      }
    }
  }
  return errors;
}

export function validateProduct(formData: Record<string, any>): Record<string, string> {
  const steps = [1, 2, 3, 4];
  let errors: Record<string, string> = {};
  for (const step of steps) {
    const stepErrors = validateProductStep(formData, step);
    errors = { ...errors, ...stepErrors };
  }
  return errors;
}
