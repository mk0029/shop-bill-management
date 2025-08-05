import { create } from "zustand";

// Static specification options based on API docs
export interface SpecificationOption {
  value: string;
  label: string;
  category?: string[];
}

interface SpecificationsStore {
  // Voltage options
  voltageOptions: SpecificationOption[];

  // Amperage options
  amperageOptions: SpecificationOption[];

  // Wire gauge options
  wireGaugeOptions: SpecificationOption[];

  // Light type options
  lightTypeOptions: SpecificationOption[];

  // Color options
  colorOptions: SpecificationOption[];

  // Size options
  sizeOptions: SpecificationOption[];

  // Material options
  materialOptions: SpecificationOption[];

  // Unit options
  unitOptions: SpecificationOption[];

  // Certification options
  certificationOptions: SpecificationOption[];

  // Storage location options
  storageLocationOptions: SpecificationOption[];

  // Actions
  getOptionsByCategory: (
    category: string,
    optionType: string
  ) => SpecificationOption[];
  getOptionLabel: (value: string, optionType: string) => string;
}

export const useSpecificationsStore = create<SpecificationsStore>(
  (set, get) => ({
    voltageOptions: [
      { value: "12V", label: "12V", category: ["light", "motor"] },
      { value: "24V", label: "24V", category: ["light", "motor"] },
      { value: "110V", label: "110V", category: ["motor", "pump"] },
      { value: "220V", label: "220V", category: ["light", "motor", "pump"] },
      { value: "240V", label: "240V", category: ["motor", "pump"] },
      { value: "415V", label: "415V", category: ["motor", "pump"] },
    ],

    amperageOptions: [
      { value: "6A", label: "6A", category: ["switch", "socket", "mcb"] },
      { value: "10A", label: "10A", category: ["switch", "socket", "mcb"] },
      { value: "16A", label: "16A", category: ["switch", "socket", "mcb"] },
      { value: "20A", label: "20A", category: ["switch", "socket", "mcb"] },
      { value: "25A", label: "25A", category: ["switch", "socket", "mcb"] },
      { value: "32A", label: "32A", category: ["switch", "socket", "mcb"] },
      { value: "40A", label: "40A", category: ["mcb"] },
      { value: "50A", label: "50A", category: ["mcb"] },
      { value: "63A", label: "63A", category: ["mcb"] },
      { value: "80A", label: "80A", category: ["mcb"] },
      { value: "100A", label: "100A", category: ["mcb"] },
    ],

    wireGaugeOptions: [
      { value: "1.0mm", label: "1.0 sq mm", category: ["wire"] },
      { value: "1.5mm", label: "1.5 sq mm", category: ["wire"] },
      { value: "2.5mm", label: "2.5 sq mm", category: ["wire"] },
      { value: "4.0mm", label: "4.0 sq mm", category: ["wire"] },
      { value: "6.0mm", label: "6.0 sq mm", category: ["wire"] },
      { value: "10.0mm", label: "10.0 sq mm", category: ["wire"] },
      { value: "16.0mm", label: "16.0 sq mm", category: ["wire"] },
      { value: "25.0mm", label: "25.0 sq mm", category: ["wire"] },
      { value: "35.0mm", label: "35.0 sq mm", category: ["wire"] },
      { value: "50.0mm", label: "50.0 sq mm", category: ["wire"] },
    ],

    lightTypeOptions: [
      { value: "LED", label: "LED", category: ["light"] },
      { value: "Bulb", label: "Bulb", category: ["light"] },
      { value: "Tube Light", label: "Tube Light", category: ["light"] },
      { value: "Panel Light", label: "Panel Light", category: ["light"] },
      {
        value: "Concealed Light",
        label: "Concealed Light",
        category: ["light"],
      },
      { value: "Street Light", label: "Street Light", category: ["light"] },
      { value: "Flood Light", label: "Flood Light", category: ["light"] },
    ],

    colorOptions: [
      { value: "White", label: "White", category: ["light"] },
      { value: "Warm White", label: "Warm White", category: ["light"] },
      { value: "Cool White", label: "Cool White", category: ["light"] },
      { value: "Yellow", label: "Yellow", category: ["light"] },
      { value: "Multicolor", label: "Multicolor", category: ["light"] },
      { value: "Red", label: "Red", category: ["wire"] },
      { value: "Black", label: "Black", category: ["wire"] },
      { value: "Blue", label: "Blue", category: ["wire"] },
      { value: "Green", label: "Green", category: ["wire"] },
    ],

    sizeOptions: [
      { value: "1ft", label: "1 ft", category: ["light"] },
      { value: "2ft", label: "2 ft", category: ["light"] },
      { value: "3ft", label: "3 ft", category: ["light"] },
      { value: "4ft", label: "4 ft", category: ["light"] },
      { value: "Small", label: "Small", category: ["light", "motor", "pump"] },
      {
        value: "Medium",
        label: "Medium",
        category: ["light", "motor", "pump"],
      },
      { value: "Large", label: "Large", category: ["light", "motor", "pump"] },
    ],

    materialOptions: [
      { value: "Plastic", label: "Plastic", category: ["switch", "socket"] },
      {
        value: "Metal",
        label: "Metal",
        category: ["switch", "socket", "light"],
      },
      { value: "Copper", label: "Copper", category: ["wire"] },
      { value: "Aluminum", label: "Aluminum", category: ["wire", "light"] },
      { value: "PVC", label: "PVC", category: ["wire"] },
      { value: "Ceramic", label: "Ceramic", category: ["socket"] },
    ],

    unitOptions: [
      { value: "piece", label: "Piece" },
      { value: "meter", label: "Meter" },
      { value: "box", label: "Box" },
      { value: "kg", label: "Kilogram" },
      { value: "set", label: "Set" },
      { value: "roll", label: "Roll" },
      { value: "pack", label: "Pack" },
      { value: "liter", label: "Liter" },
    ],

    certificationOptions: [
      { value: "ISI Mark", label: "ISI Mark" },
      { value: "BIS", label: "BIS" },
      { value: "CE", label: "CE" },
      { value: "RoHS", label: "RoHS" },
      { value: "ISO 9001", label: "ISO 9001" },
    ],

    storageLocationOptions: [
      { value: "main-store", label: "Main Store" },
      { value: "warehouse-a", label: "Warehouse A" },
      { value: "warehouse-b", label: "Warehouse B" },
      { value: "display", label: "Display Area" },
      { value: "back-room", label: "Back Room" },
    ],

    getOptionsByCategory: (category: string, optionType: string) => {
      const {
        voltageOptions,
        amperageOptions,
        wireGaugeOptions,
        lightTypeOptions,
        colorOptions,
        sizeOptions,
        materialOptions,
      } = get();

      const optionMap: Record<string, SpecificationOption[]> = {
        voltage: voltageOptions,
        amperage: amperageOptions,
        wireGauge: wireGaugeOptions,
        lightType: lightTypeOptions,
        color: colorOptions,
        size: sizeOptions,
        material: materialOptions,
      };

      const options = optionMap[optionType] || [];

      return options.filter(
        (option) => !option.category || option.category.includes(category)
      );
    },

    getOptionLabel: (value: string, optionType: string) => {
      const {
        voltageOptions,
        amperageOptions,
        wireGaugeOptions,
        lightTypeOptions,
        colorOptions,
        sizeOptions,
        materialOptions,
        unitOptions,
        certificationOptions,
        storageLocationOptions,
      } = get();

      const optionMap: Record<string, SpecificationOption[]> = {
        voltage: voltageOptions,
        amperage: amperageOptions,
        wireGauge: wireGaugeOptions,
        lightType: lightTypeOptions,
        color: colorOptions,
        size: sizeOptions,
        material: materialOptions,
        unit: unitOptions,
        certification: certificationOptions,
        storageLocation: storageLocationOptions,
      };

      const options = optionMap[optionType] || [];
      const found = options.find((option) => option.value === value);
      return found ? found.label : value;
    },
  })
);
