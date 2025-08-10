import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBill } from "@/lib/form-service";

export interface BillFormData {
  customerId: string;
  serviceType: string;
  location: string;
  billDate: string;
  dueDate: string;
  notes: string;
  repairCharges: number;
  homeVisitFee: number;
  laborCharges: number;
  // Rewinding Kit Fields
  kitName?: string;
  kitBoreSize?: number;
  kitSizeInInches?: number;
  isMultiSpeed?: boolean;
  heavyLoadOptions?: string[];
  oldWindingMaterial?: 'copper' | 'aluminum';
  newWindingMaterial?: 'copper' | 'aluminum';
  priceDifference?: number;
  windingRate?: number;
  kitType?: 'cooler' | 'motor' | 'other';
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category: string;
  brand: string;
  specifications: string;
  unit: string;
  itemType: 'standard' | 'rewinding';
}

export const useBillForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState<BillItem[]>([]);

  const [formData, setFormData] = useState<BillFormData>({
    customerId: "",
    serviceType: "",
    location: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    repairCharges: 0,
    homeVisitFee: 0,
    laborCharges: 0,
    kitName: "",
    kitBoreSize: 0,
    kitSizeInInches: 0,
    isMultiSpeed: false,
    heavyLoadOptions: [],
    oldWindingMaterial: 'copper',
    newWindingMaterial: 'copper',
    priceDifference: 0,
    windingRate: 0,
  });

  const handleInputChange = (field: keyof BillFormData, value: any) => {
    const numericFields = ["repairCharges", "homeVisitFee", "laborCharges", "kitBoreSize", "kitSizeInInches", "priceDifference", "windingRate"];
    if (numericFields.includes(field)) {
      setFormData((prev) => ({ ...prev, [field]: Number(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const addItemToBill = (product: any) => {
    const existingItem = selectedItems.find((i) => i.id === product._id);
    const maxStock = product.inventory.currentStock;

    if (existingItem) {
      if (existingItem.quantity < maxStock) {
        setSelectedItems((prev) =>
          prev.map((i) =>
            i.id === product._id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  total: Number(i.quantity + 1) * Number(i.price),
                }
              : i
          )
        );
      } else {
        setAlertMessage(`Only ${maxStock} in stock!`);
        setShowAlertModal(true);
      }
    } else {
      const specifications = getItemSpecifications(product);
      setSelectedItems((prev) => [
        ...prev,
        {
          id: product._id,
          name: getItemDisplayName(product),
          price: Number(product.pricing.sellingPrice),
          quantity: 1,
          total: Number(product.pricing.sellingPrice),
          category: product.category?.name || "Unknown",
          brand: product.brand?.name || "Unknown",
          specifications,
          unit: product.pricing.unit,
          itemType: 'standard',
        },
      ]);
    }
  };

  const addRewindingItemToBill = () => {
    const { kitName, windingRate, kitSizeInInches, priceDifference, oldWindingMaterial, newWindingMaterial } = formData;

    if (!kitName || !windingRate || !kitSizeInInches) {
        setAlertMessage("Please fill in all required rewinding kit details.");
        setShowAlertModal(true);
        return;
    }

    const price = (Number(windingRate) * Number(kitSizeInInches)) + (oldWindingMaterial !== newWindingMaterial ? Number(priceDifference) : 0);

    const rewindingItem: BillItem = {
        id: `rewinding-${Date.now()}`,
        name: `Rewinding Kit - ${kitName}`,
        price: price,
        quantity: 1,
        total: price,
        category: 'Rewinding',
        brand: 'Custom',
        specifications: `Bore: ${formData.kitBoreSize}", Size: ${formData.kitSizeInInches}", Load: ${formData.heavyLoadOptions?.join(', ')}`,
        unit: 'kit',
        itemType: 'rewinding',
    };

    setSelectedItems(prev => [...prev, rewindingItem]);
  };

  const updateItemQuantity = (
    itemId: string,
    quantity: number,
    maxStock?: number
  ) => {
    const clampedQuantity = maxStock
      ? Math.max(1, Math.min(quantity, maxStock))
      : Math.max(1, quantity);
    if (clampedQuantity <= 0) {
      setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setSelectedItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                quantity: clampedQuantity,
                total: Number(clampedQuantity) * Number(i.price),
              }
            : i
        )
      );
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + Number(item.total), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setAlertMessage("Please add at least one item to the bill");
      setShowAlertModal(true);
      return;
    }

    setIsLoading(true);

    try {
      const billData = {
        customerId: formData.customerId,
        items: selectedItems.map((item) => ({
          productId: item.itemType === 'standard' ? item.id : undefined,
          productName: item.name,
          category: item.category,
          brand: item.brand,
          specifications: item.specifications,
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
          unit: item.unit,
          isRewinding: item.itemType === 'rewinding',
        })),
        serviceType: formData.serviceType as
          | "sale"
          | "repair"
          | "custom"
          | "installation"
          | "maintenance",
        locationType: formData.location as "home" | "shop" | "office",
        homeVisitFee: Number(formData.homeVisitFee),
        repairCharges: Number(formData.repairCharges),
        laborCharges: Number(formData.laborCharges),
        notes: formData.notes,
      };

      const result = await createBill(billData);
      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setAlertMessage(result.error || "Failed to create bill");
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      setAlertMessage("Error creating bill");
      setShowAlertModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push("/admin/billing");
  };

  return {
    formData,
    selectedItems,
    isLoading,
    showSuccessModal,
    showAlertModal,
    alertMessage,
    handleInputChange,
    addItemToBill,
    updateItemQuantity,
    removeItem,
    calculateTotal,
    handleSubmit,
    handleSuccessClose,
    setShowAlertModal,
    setSelectedItems,
    addRewindingItemToBill,
  };
};

// Helper functions
const getItemDisplayName = (product: any) => {
  const specs = [];
  if (product.specifications) {
    const spec = product.specifications;
    if (spec.lightType) specs.push(spec.lightType);
    if (spec.color) specs.push(spec.color);
    if (spec.size) specs.push(spec.size);
    if (spec.wattage) specs.push(`${spec.wattage}W`);
    if (spec.wireGauge) specs.push(`${spec.wireGauge}mm`);
    if (spec.amperage) specs.push(`${spec.amperage}A`);
  }

  const categoryName = product.category?.name || "Product";
  const brandName = product.brand?.name || "Unknown Brand";
  const specString = specs.length > 0 ? ` (${specs.join(", ")})` : "";

  return `${categoryName} - ${brandName}${specString}`;
};

const getItemSpecifications = (product: any) => {
  const specs = [];
  if (product.specifications) {
    const spec = product.specifications;
    if (spec.lightType) specs.push(`Type: ${spec.lightType}`);
    if (spec.color) specs.push(`Color: ${spec.color}`);
    if (spec.size) specs.push(`Size: ${spec.size}`);
    if (spec.wattage) specs.push(`${spec.wattage}W`);
    if (spec.wireGauge) specs.push(`Gauge: ${spec.wireGauge}mm`);
    if (spec.amperage) specs.push(`${spec.amperage}A`);
  }
  return specs.join(", ");
};
