export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  location?: string;
}

export type FittingType =
  | "underground_before"
  | "underground_after"
  | "underground_wireing"
  | "open_pvc";

export type SectionDefinition = {
  title: string;
  items: string[];
};

export type SelectedItem = {
  id: string; // local id
  name: string;
  qty: number;
  unit: string;
};

export const TYPE_LABELS: Record<FittingType, string> = {
  underground_before: "Underground (Before Lanter/Slab)",
  underground_after: "Underground (After Lanter/Slab)",
  underground_wireing: "Underground (Wireing)",
  open_pvc: "Open PVC Fitting",
};

export const AMP_OPTIONS = [
  { value: "32A", label: "32A" },
  { value: "40A", label: "40A" },
  { value: "64A", label: "64A" },
];

export const WIRE_UNIT_OPTIONS = [
  { value: "roll", label: "roll" },
  { value: "mtr", label: "mtr" },
];

export const UNIT_OPTIONS = [
  { value: "pc", label: "pc" },
  { value: "mtr", label: "mtr" },
  { value: "ltr", label: "ltr" },
  { value: "kg", label: "kg" },
  { value: "box", label: "box" },
  { value: "set", label: "set" },
];

export const MCB_BOX_OPTIONS = [
  { value: "4way", label: "4way" },
  { value: "6way", label: "6way" },
  { value: "8way", label: "8way" },
  { value: "10way", label: "10way" },
  { value: "12way", label: "16way" },
  { value: "16way", label: "16way" },
  { value: "24way", label: "24way" },
];

export const FAMILY_REGEX = {
  Isolater: /^Isolater\s+(\d+A)$/i,
  Changeovevr: /^Changeovevr\s+(\d+A)$/i,
  RCCB: /^RCCB\s+(\d+A)$/i,
  McbBox: /^Mcb Box\s+(\d+way)$/i,
} as const;
