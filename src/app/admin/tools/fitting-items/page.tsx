"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Trash2, Plus, Printer, ShoppingCart, Share, Copy } from "lucide-react";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { useCustomers } from "@/hooks/use-sanity-data";
import { ShareModal } from "@/components/ui/bill-detail-modal/ShareModal";
import { AnimatePresence, motion } from "framer-motion";
import { sanitizeUserText } from "@/constants/defaults";
import { Modal } from "@/components/ui/modal";

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  location?: string;
}

type SelectedItem = {
  id: string; // local id
  name: string;
  qty: number;
  unit: string;
};

type FittingType =
  | "underground_before"
  | "underground_after"
  | "underground_wireing"
  | "open_pvc";

type SectionDefinition = {
  title: string;
  items: string[];
};

const TYPE_LABELS: Record<FittingType, string> = {
  underground_before: "Underground (Before Lanter/Slab)",
  underground_after: "Underground (After Lanter/Slab)",
  underground_wireing: "Underground (Wireing)",
  open_pvc: "Open PVC Fitting",
};

const SECTION_SETS: Record<FittingType, SectionDefinition[]> = {
  underground_before: [
    {
      title: "Fan Box & Conseild Box",
      items: ["Fan Box", "Conseild Box"],
    },
    {
      title: "Pype & Bends",
      items: ["Havey Pype", "Bends", "Hexa Blade/Aari Blade"],
    },
  ],
  underground_after: [
    {
      title: "Boards / Pypes",
      items: [
        `Normal Pype`,
        "Bends",
        "Junction Box",
        "Mcb Box 4way",
        "Mcb Box 6way",
        "Mcb Box 8way",
        "Mcb Box 10way",
        "Mcb Box 16way",
        "Mcb Box 24way",
        "Board 3x3",
        "Board 4x3",
        "Board 5x3",
        "Board 8x3",
        "Board 5x5",
        "Board 8x6",
        "Board 8x10",
        "Cutter Blade 6inch",
      ],
    },
  ],
  underground_wireing: [
    {
      title: "Switches & Sockets",
      items: [
        "6A Switch",
        "6A Socket",
        "16A Power Socket",
        "16A Power Switch",
        "Regulator",
        "Holder",
        "Indicator",
        "Dummey Plate",
        "TV Socket",
        "Round Seat",
        "Fan Seat",
        "MCB 10A",
        "MCB 16A",
        "MCB 32A",
        "Isolater 32A",
        "Isolater 40A",
        "Isolater 64A",
        "Changeovevr 32A",
        "Changeovevr 40A",
        "Changeovevr 64A",
        "RCCB 32A",
        "RCCB 40A",
        "RCCB 64A",
      ],
    },
    {
      title: "Boards Seat / MCB",
      items: [
        "Board 3x3",
        "Board 4x3",
        "Board 5x3",
        "Board 8x3",
        "Board 5x5",
        "Board 8x6",
        "Board 8x10",
      ],
    },
    {
      title: "Wires",
      items: [
        "Wire 1.0 sqmm Copper",
        "Wire 1.5 sqmm Copper",
        "Wire 2.5 sqmm Copper",
        "Wire 4.0 sqmm Copper",
        "Wire 6.0 sqmm Copper",
        "Wire 4.0 sqmm Aluminuem",
        "Wire 6.0 sqmm Aluminuem",
        "Wire 10.0 sqmm Aluminuem",
        "Wire 16.0 sqmm Aluminuem",
      ],
    },
    {
      title: "Patches / Tape",
      items: [
        'Black Screws 1.5"',
        'Black Screws 2"',
        'Black Screws 2.5"',
        'Brass Screws 1.5"',
        'Brass Screws 2"',
        'Brass Screws 2.5"',
        "Tape Role 15mtr",
        "Jointer Normal",
        "Jointer 16~32amp",
        "Batten Gitti",
        "Pvc Gitti 40mm",
        "Wire Clip 4mm",
        "Wire Clip 6mm",
        "Wire Clip 10mm",
        "Wire Clip 16mm",
        "Wire Clip 25mm",
      ],
    },
  ],
  open_pvc: [
    {
      title: "Switches & Sockets",
      items: [
        "6A Switch",
        "6A Socket",
        "16A Power Socket",
        "16A Power Switch",
        "Regulator",
        "Holder",
        "Ceiling Rose",
        "Round Block",
        "Indicator",
        "Dummey Plate",
        "MCB 10A",
        "MCB 16A",
        "MCB 32A",
        "Isolater 32A",
        "Isolater 40A",
        "Isolater 64A",
        "Changeovevr 32A",
        "Changeovevr 40A",
        "Changeovevr 64A",
        "RCCB 32A",
        "RCCB 40A",
        "RCCB 64A",
      ],
    },
    {
      title: "Boards / PVC Casing",
      items: [
        `Fatti 0.5"`,
        `Fatti 1"`,
        "Board 3x3",
        "Board 4x3",
        "Board 5x3",
        "Board 8x3",
        "Board 5x5",
        "Board 8x6",
        "Board 8x10",
        "Mcb Box 4way",
        "Mcb Box 6way",
        "Mcb Box 8way",
      ],
    },
    {
      title: "Wires",
      items: [
        "Wire 1.0 sqmm Copper",
        "Wire 1.5 sqmm Copper",
        "Wire 2.5 sqmm Copper",
        "Wire 4.0 sqmm Copper",
        "Wire 6.0 sqmm Copper",
        "Wire 4.0 sqmm Aluminuem",
        "Wire 6.0 sqmm Aluminuem",
        "Wire 10.0 sqmm Aluminuem",
        "Wire 16.0 sqmm Aluminuem",
      ],
    },
    {
      title: "Patches / Tape",
      items: [
        ' Black Screws 0.5"',
        ' Black Screws 1"',
        ' Black Screws 1.5"',
        ' Black Screws 2"',
        ' Black Screws 2.5"',
        "Tape Role 15mtr",
        "Batten Gitti",
        "Pvc Gitti 40mm",
        "Wire Clip 4mm",
        "Wire Clip 6mm",
        "Wire Clip 10mm",
        "Wire Clip 16mm",
        "Wire Clip 25mm",
        "Gatter Patti",
        "Jointer Normal",
        "Jointer 16~32amp",
      ],
    },
  ],
};

// Families with amp sub-options to render as a single row with a Dropdown
const AMP_OPTIONS = [
  { value: "32A", label: "32A" },
  { value: "40A", label: "40A" },
  { value: "64A", label: "64A" },
];

const WIRE_UNIT_OPTIONS = [
  { value: "roll", label: "roll" },
  { value: "mtr", label: "mtr" },
];

const UNIT_OPTIONS = [
  { value: "pc", label: "pc" },
  { value: "mtr", label: "mtr" },
  { value: "ltr", label: "ltr" },
  { value: "kg", label: "kg" },
  { value: "box", label: "box" },
  { value: "set", label: "set" },
];

const MCB_BOX_OPTIONS = [
  { value: "4way", label: "4way" },
  { value: "6way", label: "6way" },
  { value: "8way", label: "8way" },
  { value: "10way", label: "10way" },
  { value: "12way", label: "16way" },
  { value: "16way", label: "16way" },
  { value: "24way", label: "24way" },
];

const FAMILY_REGEX = {
  Isolater: /^Isolater\s+(\d+A)$/i,
  Changeovevr: /^Changeovevr\s+(\d+A)$/i,
  RCCB: /^RCCB\s+(\d+A)$/i,
  McbBox: /^Mcb Box\s+(\d+way)$/i,
} as const;

export default function FittingItemsListPage() {
  const { customers } = useCustomers();
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState<any>(null);
  const [unit, setUnit] = useState<string>("pc");
  const [fitType, setFitType] = useState<FittingType>("underground_before");
  const [fixedQuantities, setFixedQuantities] = useState<
    Record<string, number>
  >({});
  const [familySelect, setFamilySelect] = useState<Record<string, string>>({
    Isolater: "32A",
    Changeovevr: "32A",
    RCCB: "32A",
    McbBox: "4way",
  });
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [wireUnitMode, setWireUnitMode] = useState<"roll" | "mtr">("roll");

  const addItem = (name: string, q: number, u: string) => {
    const cleanName = name.trim();
    const cleanQty = Number.isFinite(q) && q > 0 ? Math.floor(q) : 0;
    if (!cleanName || cleanQty <= 0) return;
    const id = `${cleanName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [
      ...prev,
      { id, name: cleanName, qty: cleanQty, unit: u },
    ]);
  };

  const onAddClick = () => {
    addItem(itemName, qty, unit);
    setItemName("");
    setQty(1);
  };

  const onPreset = (label: string) => {
    // Check if this is a wire item
    const isWireItem = label.toLowerCase().includes("wire");
    const unitToUse = isWireItem ? wireUnitMode : unit;

    // Quick add with current quantity and appropriate unit
    addItem(label, qty > 0 ? qty : 1, unitToUse);
  };

  const updateQty = (id: string, next: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, qty: Math.max(0, Math.floor(next || 0)) } : it,
      ),
    );
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.id !== id));
  const clearAll = () => setItems([]);

  const onFixedQtyChange = (name: string, v: number) => {
    const next = Math.max(0, Math.floor(v || 0));
    setFixedQuantities((prev) => ({ ...prev, [name]: next }));
  };

  const applyFixedToList = () => {
    const defs = SECTION_SETS[fitType];
    const original = defs.flatMap((s) => s.items);
    // Determine which families exist in this type
    const hasIsolater = original.some((n) => FAMILY_REGEX.Isolater.test(n));
    const hasChange = original.some((n) => FAMILY_REGEX.Changeovevr.test(n));
    const hasRccb = original.some((n) => FAMILY_REGEX.RCCB.test(n));
    const hasMcbBox = original.some((n) => FAMILY_REGEX.McbBox.test(n));
    const composed: string[] = [];
    if (hasIsolater) composed.push(`Isolater ${familySelect.Isolater}`);
    if (hasChange) composed.push(`Changeovevr ${familySelect.Changeovevr}`);
    if (hasRccb) composed.push(`RCCB ${familySelect.RCCB}`);
    if (hasMcbBox) composed.push(`Mcb Box ${familySelect.McbBox}`);
    // Allowed names: non-family originals + composed family selections
    const allowed = original
      .filter(
        (n) =>
          !FAMILY_REGEX.Isolater.test(n) &&
          !FAMILY_REGEX.Changeovevr.test(n) &&
          !FAMILY_REGEX.RCCB.test(n) &&
          !FAMILY_REGEX.McbBox.test(n),
      )
      .concat(composed);
    const positives = allowed.filter((n) => (fixedQuantities[n] || 0) > 0);
    if (positives.length === 0) return;
    const now = Date.now();
    const newItems: SelectedItem[] = positives.map((n, i) => {
      // Check if this is a wire item and use appropriate unit
      const isWireItem = n.toLowerCase().includes("wire");
      const unitToUse = isWireItem ? wireUnitMode : "pc";

      return {
        id: `${n}-${now}-${i}`,
        name: n,
        qty: fixedQuantities[n],
        unit: unitToUse,
      };
    });
    setItems((prev) => [...prev, ...newItems]);
  };

  const shareLine = useMemo(() => {
    if (items.length === 0) return "";
    return items.map((it) => `${it.qty}${it.unit} ${it.name}`).join(", ");
  }, [items]);

  const printList = () => {
    window.print();
  };

  const formatWhatsAppMessage = () => {
    if (items.length === 0) return "";

    const selectedCustomer = customers.find(
      (c) => c._id === selectedCustomerId,
    );
    const customerName = selectedCustomer?.name || "Customer";
    const customerPhone = selectedCustomer?.phone || "";
    const customerPassKey = selectedCustomer?.secretKey || "";

    // Standardize unit display
    const formatUnit = (unit: string) => {
      switch (unit.toLowerCase()) {
        case "pc":
          return unit === "1" ? "pc" : "pcs";
        default:
          return unit;
      }
    };

    // Group items by categories
    const groupedItems = {
      "Pipes & Accessories": [] as string[],
      "Boxes & Enclosures": [] as string[],
      "Switches & Accessories": [] as string[],
      "Protection Devices": [] as string[],
      "Wires & Cables": [] as string[],
      "Tools & Others": [] as string[],
    };

    items.forEach((item) => {
      const itemName = item.name.toLowerCase();
      const formattedLine = `• ${item.name} : ${item.qty} ${formatUnit(item.unit)}`;

      // Categorize based on keywords
      if (
        itemName.includes("pipe") ||
        itemName.includes("bend") ||
        itemName.includes("fatti") ||
        itemName.includes("pvc") ||
        itemName.includes("gitti")
      ) {
        groupedItems["Pipes & Accessories"].push(formattedLine);
      } else if (
        itemName.includes("junction box") ||
        itemName.includes("mcb box") ||
        itemName.includes("board") ||
        itemName.includes("fan box") ||
        itemName.includes("conseild box") ||
        itemName.includes("concealed box")
      ) {
        groupedItems["Boxes & Enclosures"].push(formattedLine);
      } else if (
        itemName.includes("switch") ||
        itemName.includes("socket") ||
        itemName.includes("regulator") ||
        itemName.includes("holder") ||
        itemName.includes("indicator") ||
        itemName.includes("plate") ||
        itemName.includes("seat")
      ) {
        groupedItems["Switches & Accessories"].push(formattedLine);
      } else if (
        itemName.includes("mcb") ||
        itemName.includes("rccb") ||
        itemName.includes("isolater") ||
        itemName.includes("changeovevr") ||
        itemName.includes("isolator") ||
        itemName.includes("changeover")
      ) {
        groupedItems["Protection Devices"].push(formattedLine);
      } else if (itemName.includes("wire")) {
        groupedItems["Wires & Cables"].push(formattedLine);
      } else {
        groupedItems["Tools & Others"].push(formattedLine);
      }
    });

    // Build the message
    let message = "";

    // Header
    message += `🔌 *JAMBH ELECTRICAL SERVICES*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📄 *Electrical Fitting Items Quotation*\n\n`;

    message += `Dear ${sanitizeUserText(customerName)},\n\n`;
    message += `Thank you for choosing *Jambh Electrical Services*. Below is list of items required for your electrical work:\n\n`;

    message += `📋 *ITEMS LIST*\n\n`;

    // Add categorized items with section headers
    const categoryEmojis = {
      "Pipes & Accessories": "🟦",
      "Boxes & Enclosures": "🟨",
      "Switches & Accessories": "🟩",
      "Protection Devices": "🟦",
      "Wires & Cables": "🟪",
      "Tools & Others": "🟥",
    };

    Object.entries(groupedItems).forEach(([category, items]) => {
      if (items.length > 0) {
        message += `${categoryEmojis[category as keyof typeof categoryEmojis]} *${category}*\n`;
        items.forEach((item) => {
          message += `${item}\n`;
        });
        message += `\n`;
      }
    });

    // Footer
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🔐 *Customer Login Portal*\n`;
    message += `Access your bills and order history:\n`;

    const digits = customerPhone.replace(/\D/g, "");
    const loginUrl = `https://jambh-ell.vercel.app/login?phone=${encodeURIComponent(digits)}&passKey=${encodeURIComponent(customerPassKey)}`;
    message += `${loginUrl}\n\n`;

    message += `💡 *Quality Products for Better Performance & Durability*\n\n`;
    message += `Thank you for your trust 🙏\n`;
    message += `⚡ Reliable • Professional • Trusted Service\n\n`;
    message += `— *Jambh Electrical Services*`;

    return message;
  };

  const onShareOnWhatsApp = () => {
    const message = formatWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    const selectedCustomer = customers.find(
      (c) => c._id === selectedCustomerId,
    );
    const phoneNumber = selectedCustomer?.phone || "";

    if (phoneNumber) {
      window.open(
        `https://wa.me/${phoneNumber.replace(/[^0-9]/g, "")}?text=${encodedMessage}`,
        "_blank",
      );
    } else {
      window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
    }

    setShowShareModal(false);
    setShowSharePopup(false);
  };

  const onNativeShare = () => {
    const message = formatWhatsAppMessage();

    if (navigator.share) {
      navigator.share({
        title: "Electrical Fitting Items Quotation",
        text: message,
      });
    } else {
      navigator.clipboard.writeText(message);
    }

    setShowShareModal(false);
    setShowSharePopup(false);
  };

  const onCopyToClipboard = () => {
    const message = formatWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setShowShareModal(false);
    setShowSharePopup(false);
  };

  const onShareClick = () => {
    setShowSharePopup(true);
  };

  const onSharePopupShare = () => {
    setShowShareModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
          Fitting Items List
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-200"
            onClick={printList}
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-200"
            onClick={clearAll}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Fitting Type</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as FittingType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFitType(t)}
                className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                  fitType === t
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="max-sm:max-h-[85dvh] overflow-auto space-y-4">
        {" "}
        <ResponsiveAccordion
          defaultOpenMobile
          className="bg-gray-900 border-gray-800"
          title={
            <CardHeader className="!p-0 sticky top-0 z-10 bg-gray-900">
              <CardTitle className="text-white">
                Add by Categories (Fixed Items)
              </CardTitle>
            </CardHeader>
          }
        >
          <Card className="">
            <CardContent className="space-y-4 text-gray-300">
              <div className="space-y-6">
                {SECTION_SETS[fitType].map((sec) => {
                  const hasIsolater = sec.items.some((n) =>
                    FAMILY_REGEX.Isolater.test(n),
                  );
                  const hasChange = sec.items.some((n) =>
                    FAMILY_REGEX.Changeovevr.test(n),
                  );
                  const hasRccb = sec.items.some((n) =>
                    FAMILY_REGEX.RCCB.test(n),
                  );
                  const hasMcbBox = sec.items.some((n) =>
                    FAMILY_REGEX.McbBox.test(n),
                  );
                  const filtered = sec.items.filter(
                    (n) =>
                      !FAMILY_REGEX.Isolater.test(n) &&
                      !FAMILY_REGEX.Changeovevr.test(n) &&
                      !FAMILY_REGEX.RCCB.test(n) &&
                      !FAMILY_REGEX.McbBox.test(n),
                  );
                  return (
                    <div key={sec.title}>
                      <div className="text-gray-200 font-medium mb-2">
                        {sec.title}
                        {sec.title === "Wires" && (
                          <div className="mt-2 flex items-center gap-3">
                            <Label className="text-gray-300 text-sm">
                              Wire Unit:
                            </Label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setWireUnitMode("roll")}
                                className={`px-3 py-1 rounded text-sm border transition-colors ${
                                  wireUnitMode === "roll"
                                    ? "bg-blue-600 border-blue-500 text-white"
                                    : "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                                }`}
                              >
                                Roll
                              </button>
                              <button
                                onClick={() => setWireUnitMode("mtr")}
                                className={`px-3 py-1 rounded text-sm border transition-colors ${
                                  wireUnitMode === "mtr"
                                    ? "bg-blue-600 border-blue-500 text-white"
                                    : "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                                }`}
                              >
                                Meters
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtered.map((n) => (
                          <div
                            key={n}
                            className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950"
                          >
                            <div className="text-white text-sm">{n}</div>
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={fixedQuantities[n] ?? ""}
                              onChange={(e) =>
                                onFixedQtyChange(
                                  n,
                                  Number(e.target.value || ""),
                                )
                              }
                              className="bg-gray-800 border-gray-700 text-white w-24"
                            />
                          </div>
                        ))}

                        {hasIsolater && (
                          <div className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950">
                            <div className="text-white text-sm">Isolater</div>
                            <div className="flex items-center gap-2">
                              <Dropdown
                                options={AMP_OPTIONS}
                                value={familySelect.Isolater}
                                onValueChange={(v) =>
                                  setFamilySelect((s) => ({
                                    ...s,
                                    Isolater: v,
                                  }))
                                }
                                placeholder="Amp"
                                className="min-w-[100px]"
                              />
                              <Input
                                type="number"
                                inputMode="numeric"
                                value={
                                  fixedQuantities[
                                    `Isolater ${familySelect.Isolater}`
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  onFixedQtyChange(
                                    `Isolater ${familySelect.Isolater}`,
                                    Number(e.target.value || ""),
                                  )
                                }
                                className="bg-gray-800 border-gray-700 text-white w-24"
                              />
                            </div>
                          </div>
                        )}

                        {hasChange && (
                          <div className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950">
                            <div className="text-white text-sm">
                              Changeovevr
                            </div>
                            <div className="flex items-center gap-2">
                              <Dropdown
                                options={AMP_OPTIONS}
                                value={familySelect.Changeovevr}
                                onValueChange={(v) =>
                                  setFamilySelect((s) => ({
                                    ...s,
                                    Changeovevr: v,
                                  }))
                                }
                                placeholder="Amp"
                                className="min-w-[100px]"
                              />
                              <Input
                                type="number"
                                inputMode="numeric"
                                value={
                                  fixedQuantities[
                                    `Changeovevr ${familySelect.Changeovevr}`
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  onFixedQtyChange(
                                    `Changeovevr ${familySelect.Changeovevr}`,
                                    Number(e.target.value || ""),
                                  )
                                }
                                className="bg-gray-800 border-gray-700 text-white w-24"
                              />
                            </div>
                          </div>
                        )}

                        {hasRccb && (
                          <div className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950">
                            <div className="text-white text-sm">RCCB</div>
                            <div className="flex items-center gap-2">
                              <Dropdown
                                options={AMP_OPTIONS}
                                value={familySelect.RCCB}
                                onValueChange={(v) =>
                                  setFamilySelect((s) => ({ ...s, RCCB: v }))
                                }
                                placeholder="Amp"
                                className="min-w-[100px]"
                              />
                              <Input
                                type="number"
                                inputMode="numeric"
                                value={
                                  fixedQuantities[
                                    `RCCB ${familySelect.RCCB}`
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  onFixedQtyChange(
                                    `RCCB ${familySelect.RCCB}`,
                                    Number(e.target.value || ""),
                                  )
                                }
                                className="bg-gray-800 border-gray-700 text-white w-24"
                              />
                            </div>
                          </div>
                        )}

                        {hasMcbBox && (
                          <div className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950">
                            <div className="text-white text-sm">Mcb Box</div>
                            <div className="flex items-center gap-2">
                              <Dropdown
                                options={MCB_BOX_OPTIONS}
                                value={familySelect.McbBox}
                                onValueChange={(v) =>
                                  setFamilySelect((s) => ({ ...s, McbBox: v }))
                                }
                                placeholder="Ways"
                                className="min-w-[100px]"
                                removeSearchForce
                              />
                              <Input
                                type="number"
                                inputMode="numeric"
                                value={
                                  fixedQuantities[
                                    `Mcb Box ${familySelect.McbBox}`
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  onFixedQtyChange(
                                    `Mcb Box ${familySelect.McbBox}`,
                                    Number(e.target.value || ""),
                                  )
                                }
                                className="bg-gray-800 border-gray-700 text-white w-24"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-1">
                <Button
                  className="bg-blue-600 hover:bg-blue-500"
                  onClick={applyFixedToList}
                >
                  Add Selected to List
                </Button>
              </div>
            </CardContent>
          </Card>
        </ResponsiveAccordion>
        <ResponsiveAccordion
          desktopCollapsible
          className="bg-gray-900 border-gray-800"
          title={
            <CardHeader className="!p-0">
              <CardTitle className="text-white">Add Other Items</CardTitle>
            </CardHeader>
          }
        >
          <Card>
            <CardContent className="space-y-4 text-gray-300">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <div>
                  <Label className="text-gray-200">Item name</Label>
                  <Input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. 6A Socket"
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-200">Quantity</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={Number.isFinite(qty) ? qty : ""}
                      onChange={(e) =>
                        setQty(
                          Math.max(0, Math.floor(Number(e.target.value || ""))),
                        )
                      }
                      className="bg-gray-800 border-gray-700 text-white w-28"
                    />
                    <Dropdown
                      options={UNIT_OPTIONS}
                      removeSearchForce
                      value={unit}
                      onValueChange={setUnit}
                      placeholder="Unit"
                      className="min-w-[80px]"
                    />
                  </div>
                </div>
                <div className="flex">
                  <Button
                    className="bg-blue-600 hover:bg-blue-500 w-full"
                    onClick={onAddClick}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </ResponsiveAccordion>
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Selected Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300">
            {items.length === 0 ? (
              <div className="text-gray-400">No items added yet.</div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {items.map((it) => (
                  <div className="flex items-center gap-3 p-2 border border-gray-800 rounded-md bg-gray-950">
                    <div className="flex-1 text-white">{it.name}</div>
                    <div className="flex items-center  gap-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={it.qty}
                        onChange={(e) =>
                          updateQty(it.id, Number(e.target.value || 0))
                        }
                        className="bg-gray-800 border-gray-700 text-white w-16 sm:w-24"
                      />
                      <div className="text-gray-300 text-sm w-12">
                        {it.unit}
                      </div>
                      <Button
                        variant="ghost"
                        className="text-red-300 hover:text-red-200"
                        onClick={() => removeItem(it.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-3">
                <Label className="text-gray-200">Share Options</Label>
                <div className="flex w-full gap-2 mt-1">
                  <Button
                    onClick={onShareClick}
                    className="bg-green-600 hover:bg-green-700 flex items-center gap-2 max-sm:flex-1"
                  >
                    <Share className="w-4 h-4" /> Share
                  </Button>
                  <Button
                    onClick={() => navigator.clipboard.writeText(shareLine)}
                    variant="outline"
                    className="border-gray-700 text-gray-200 flex items-center gap-2 max-sm:flex-1"
                  >
                    <Copy className="w-4 h-4" /> Copy List
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share Popup */}
      <Modal
        isOpen={showSharePopup}
        onClose={() => setShowSharePopup(false)}
        title="Share Quotation"
        size="md"
        className=""
      >
        <div className="flex flex-col justify-between  min-h-[200px]">
          <div>
            <Label className="text-gray-200">Select Customer</Label>
            <CustomerAutocomplete
              customers={customers}
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              placeholder="Type customer name"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              disabled={!selectedCustomerId}
              onClick={onSharePopupShare}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Share
            </Button>
            <Button
              onClick={() => setShowSharePopup(false)}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <ShareModal
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        onShareOnWhatsApp={onShareOnWhatsApp}
        onNativeShare={onNativeShare}
        onCopyToClipboard={onCopyToClipboard}
      />
    </div>
  );
}
