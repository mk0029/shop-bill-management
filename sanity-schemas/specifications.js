// sanity-schemas/specifications.js
export default {
  name: "specifications",
  title: "Product Specifications",
  type: "object",
  fields: [
    // Electrical specifications
    {
      name: "voltage",
      title: "Voltage",
      type: "string",
      description: "Voltage rating (e.g., 220V, 110V)",
    },
    {
      name: "wattage",
      title: "Wattage",
      type: "string",
      description: "Power consumption in watts",
    },
    {
      name: "amperage",
      title: "Amperage",
      type: "string",
      description: "Current rating in amperes",
    },
    {
      name: "loadCapacity",
      title: "Load Capacity",
      type: "string",
      description: "Maximum load capacity",
    },
    {
      name: "wireGauge",
      title: "Wire Gauge",
      type: "string",
      description: "Wire thickness/gauge",
    },
    {
      name: "core",
      title: "Core",
      type: "string",
      description: "Number of cores (for wires/cables)",
    },
    
    // Light specifications
    {
      name: "lightType",
      title: "Light Type",
      type: "string",
      description: "Type of light (LED, CFL, etc.)",
    },
    {
      name: "color",
      title: "Color",
      type: "string",
      description: "Color of the product",
    },
    {
      name: "lumens",
      title: "Lumens",
      type: "string",
      description: "Brightness in lumens",
    },
    
    // Physical properties
    {
      name: "size",
      title: "Size",
      type: "string",
      description: "Size or dimensions",
    },
    {
      name: "weight",
      title: "Weight",
      type: "string",
      description: "Weight of the product",
    },
    {
      name: "material",
      title: "Material",
      type: "string",
      description: "Material composition",
    },
    
    // Product-specific fields
    {
      name: "modal",
      title: "Modal",
      type: "string",
      description: "Product model number",
    },
    {
      name: "modular",
      title: "Modular",
      type: "boolean",
      description: "Whether the product is modular",
    },
    
    // Warranty information
    {
      name: "hasWarranty",
      title: "Has Warranty",
      type: "boolean",
      description: "Whether the product has a warranty",
    },
    {
      name: "warrantyMonths",
      title: "Warranty Period",
      type: "number",
      description: "Warranty period in months",
    },
    
    // Certifications
    {
      name: "certifications",
      title: "Certifications",
      type: "array",
      of: [{ type: "string" }],
      description: "Product certifications (e.g., ISI, CE)",
    },
  ],
  preview: {
    select: {
      voltage: "voltage",
      amperage: "amperage",
      lightType: "lightType",
      wireGauge: "wireGauge",
    },
    prepare(selection) {
      const { voltage, amperage, lightType, wireGauge } = selection;
      let subtitle = [];
      
      if (voltage) subtitle.push(`${voltage}`);
      if (amperage) subtitle.push(`${amperage}`);
      if (lightType) subtitle.push(`${lightType}`);
      if (wireGauge) subtitle.push(`${wireGauge}mm`);
      
      return {
        title: "Product Specifications",
        subtitle: subtitle.join(" | "),
      };
    },
  },
};