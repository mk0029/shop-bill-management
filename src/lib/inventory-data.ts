// Inventory Data Helper File
// Contains all local data arrays and constants for inventory management

export const currency = "₹";

// Item Categories
export const itemCategories = [
  { value: "light", label: "Light" },
  { value: "motor", label: "Motor" },
  { value: "pump", label: "Pump" },
  { value: "wire", label: "Wire" },
  { value: "switch", label: "Switch" },
  { value: "socket", label: "Socket" },
  { value: "mcb", label: "MCB" },
  { value: "other", label: "Other" },
];

// Light Types
export const lightTypes = [
  { value: "led", label: "LED" },
  { value: "bulb", label: "Bulb" },
  { value: "tubelight", label: "Tubelight" },
  { value: "panel", label: "Panel" },
  { value: "concealed", label: "Concealed" },
];

// Colors
export const colors = [
  { value: "white", label: "White" },
  { value: "warm-white", label: "Warm White" },
  { value: "cool-white", label: "Cool White" },
  { value: "daylight", label: "Daylight" },
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "orange", label: "Orange" },
  { value: "purple", label: "Purple" },
];

// Sizes
export const sizes = [
  { value: "1x1", label: "1x1 ft" },
  { value: "2x2", label: "2x2 ft" },
  { value: "3x3", label: "3x3 ft" },
  { value: "4x4", label: "4x4 ft" },
  { value: "1x2", label: "1x2 ft" },
  { value: "2x4", label: "2x4 ft" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

// Wire Gauges
export const wireGauges = [
  { value: "0.5", label: "0.5 sq mm" },
  { value: "1", label: "1 sq mm" },
  { value: "1.5", label: "1.5 sq mm" },
  { value: "2.5", label: "2.5 sq mm" },
  { value: "4", label: "4 sq mm" },
  { value: "6", label: "6 sq mm" },
  { value: "10", label: "10 sq mm" },
  { value: "16", label: "16 sq mm" },
  { value: "25", label: "25 sq mm" },
  { value: "35", label: "35 sq mm" },
  { value: "50", label: "50 sq mm" },
  { value: "70", label: "70 sq mm" },
  { value: "95", label: "95 sq mm" },
  { value: "120", label: "120 sq mm" },
  { value: "150", label: "150 sq mm" },
  { value: "185", label: "185 sq mm" },
  { value: "240", label: "240 sq mm" },
];

// Ampere Ratings
export const ampereRatings = [
  { value: "6", label: "6A" },
  { value: "10", label: "10A" },
  { value: "16", label: "16A" },
  { value: "20", label: "20A" },
  { value: "25", label: "25A" },
  { value: "32", label: "32A" },
  { value: "40", label: "40A" },
  { value: "50", label: "50A" },
  { value: "63", label: "63A" },
  { value: "80", label: "80A" },
  { value: "100", label: "100A" },
  { value: "125", label: "125A" },
  { value: "160", label: "160A" },
  { value: "200", label: "200A" },
  { value: "250", label: "250A" },
  { value: "315", label: "315A" },
  { value: "400", label: "400A" },
  { value: "500", label: "500A" },
  { value: "630", label: "630A" },
  { value: "800", label: "800A" },
  { value: "1000", label: "1000A" },
];

// Units
export const units = [
  { value: "piece", label: "Piece" },
  { value: "meter", label: "Meter" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "roll", label: "Roll" },
  { value: "set", label: "Set" },
  { value: "kg", label: "Kilogram" },
  { value: "liter", label: "Liter" },
];

// Popular Brands (can be managed by admin)
export const popularBrands = [
  { value: "havells", label: "Havells", categories: ["light", "motor", "pump"] },
  { value: "philips", label: "Philips", categories: ["light"] },
  { value: "bajaj", label: "Bajaj", categories: ["light", "motor"] },
  { value: "anchor", label: "Anchor", categories: ["switch", "socket", "mcb"] },
  { value: "polycab", label: "Polycab", categories: ["wire"] },
  { value: "finolex", label: "Finolex", categories: ["wire"] },
  { value: "crompton", label: "Crompton", categories: ["light", "motor", "pump"] },
  { value: "orient", label: "Orient", categories: ["light", "motor"] },
  { value: "usha", label: "Usha", categories: ["light", "motor"] },
  { value: "wipro", label: "Wipro", categories: ["light"] },
  { value: "syska", label: "Syska", categories: ["light"] },
  { value: "surya", label: "Surya", categories: ["light"] },
  { value: "other", label: "Other", categories: ["light", "motor", "pump", "wire", "switch", "socket", "mcb"] },
];

// Mock Inventory Items (for development)
export const mockInventoryItems = [
  // Lights
  {
    id: "1",
    category: "light",
    lightType: "led",
    color: "white",
    size: "",
    watts: "5",
    wireGauge: "",
    ampere: "",
    brand: "havells",
    purchasePrice: 67,
    sellingPrice: 90,
    currentStock: 50,
    unit: "piece",
    description: "Havells 5W LED bulb in white color",
  },
  {
    id: "2",
    category: "light",
    lightType: "led",
    color: "warm-white",
    size: "",
    watts: "12",
    wireGauge: "",
    ampere: "",
    brand: "philips",
    purchasePrice: 120,
    sellingPrice: 150,
    currentStock: 30,
    unit: "piece",
    description: "Philips 12W LED bulb in warm white",
  },
  {
    id: "3",
    category: "light",
    lightType: "panel",
    color: "white",
    size: "2x2",
    watts: "20",
    wireGauge: "",
    ampere: "",
    brand: "havells",
    purchasePrice: 450,
    sellingPrice: 600,
    currentStock: 15,
    unit: "piece",
    description: "Havells 20W LED panel 2x2 ft",
  },
  // Wires
  {
    id: "4",
    category: "wire",
    lightType: "",
    color: "",
    size: "",
    watts: "",
    wireGauge: "1.5",
    ampere: "",
    brand: "polycab",
    purchasePrice: 1200,
    sellingPrice: 1500,
    currentStock: 100,
    unit: "meter",
    description: "Polycab 1.5 sq mm wire",
  },
  {
    id: "5",
    category: "wire",
    lightType: "",
    color: "",
    size: "",
    watts: "",
    wireGauge: "2.5",
    ampere: "",
    brand: "finolex",
    purchasePrice: 1800,
    sellingPrice: 2200,
    currentStock: 80,
    unit: "meter",
    description: "Finolex 2.5 sq mm wire",
  },
  // Switches & MCB
  {
    id: "6",
    category: "switch",
    lightType: "",
    color: "",
    size: "",
    watts: "",
    wireGauge: "",
    ampere: "16",
    brand: "anchor",
    purchasePrice: 45,
    sellingPrice: 60,
    currentStock: 100,
    unit: "piece",
    description: "Anchor 16A switch",
  },
  {
    id: "7",
    category: "mcb",
    lightType: "",
    color: "",
    size: "",
    watts: "",
    wireGauge: "",
    ampere: "32",
    brand: "havells",
    purchasePrice: 180,
    sellingPrice: 250,
    currentStock: 25,
    unit: "piece",
    description: "Havells 32A MCB",
  },
  // Motors
  {
    id: "8",
    category: "motor",
    lightType: "",
    color: "",
    size: "",
    watts: "1000",
    wireGauge: "",
    ampere: "",
    brand: "crompton",
    purchasePrice: 2500,
    sellingPrice: 3200,
    currentStock: 8,
    unit: "piece",
    description: "Crompton 1HP motor",
  },
  {
    id: "9",
    category: "pump",
    lightType: "",
    color: "",
    size: "",
    watts: "500",
    wireGauge: "",
    ampere: "",
    brand: "kirloskar",
    purchasePrice: 1800,
    sellingPrice: 2400,
    currentStock: 12,
    unit: "piece",
    description: "Kirloskar 0.5HP pump",
  },
];

// Helper Functions
export const getCategoryLabel = (category: string) => {
  const found = itemCategories.find(cat => cat.value === category);
  return found ? found.label : category;
};

export const getLightTypeLabel = (lightType: string) => {
  const found = lightTypes.find(type => type.value === lightType);
  return found ? found.label : lightType;
};

export const getBrandLabel = (brand: string) => {
  const found = popularBrands.find(b => b.value === brand);
  return found ? found.label : brand;
};

export const getUnitLabel = (unit: string) => {
  const found = units.find(u => u.value === unit);
  return found ? found.label : unit;
};

interface InventoryItem {
  id: string;
  category: string;
  lightType: string;
  color: string;
  size: string;
  watts: string;
  wireGauge: string;
  ampere: string;
  brand: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  unit: string;
  description: string;
}

export const getItemSpecifications = (item: InventoryItem) => {
  const specs = [];
  if (item.lightType) specs.push(`Type: ${getLightTypeLabel(item.lightType)}`);
  if (item.color) specs.push(`Color: ${item.color}`);
  if (item.size) specs.push(`Size: ${item.size}`);
  if (item.watts) specs.push(`${item.watts}W`);
  if (item.wireGauge) specs.push(`Gauge: ${item.wireGauge} sq mm`);
  if (item.ampere) specs.push(`${item.ampere}A`);
  return specs.join(", ");
};

export const getItemDisplayName = (item: InventoryItem) => {
  const category = getCategoryLabel(item.category);
  const brand = getBrandLabel(item.brand);
  const specs = getItemSpecifications(item);
  return `${category} - ${brand} (${specs})`;
}; 