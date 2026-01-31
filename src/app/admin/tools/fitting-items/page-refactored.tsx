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
import { sendViaWaBot } from "@/lib/wa-bot-send";
import { AnimatePresence, motion } from "framer-motion";
import { sanitizeUserText } from "@/constants/defaults";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";

// Import sub-components
import HeaderSection from "./components/HeaderSection";
import FittingTypeSelector from "./components/FittingTypeSelector";
import AddOtherItems from "./components/AddOtherItems";
import SelectedItemsList from "./components/SelectedItemsList";
import SharePopup from "./components/SharePopup";
import FixedItemsSection from "./components/FixedItemsSection";

// Import types and constants
import {
  Customer,
  FittingType,
  SelectedItem,
  TYPE_LABELS,
  AMP_OPTIONS,
  WIRE_UNIT_OPTIONS,
  UNIT_OPTIONS,
  MCB_BOX_OPTIONS,
  FAMILY_REGEX,
} from "./types";
import { SECTION_SETS } from "./constants";

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
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
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
    const isWireItem = label.toLowerCase().includes("wire");
    const unitToUse = isWireItem ? wireUnitMode : unit;
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
    const hasIsolater = original.some((n) => FAMILY_REGEX.Isolater.test(n));
    const hasChange = original.some((n) => FAMILY_REGEX.Changeovevr.test(n));
    const hasRccb = original.some((n) => FAMILY_REGEX.RCCB.test(n));
    const hasMcbBox = original.some((n) => FAMILY_REGEX.McbBox.test(n));
    const composed: string[] = [];
    if (hasIsolater) composed.push(`Isolater ${familySelect.Isolater}`);
    if (hasChange) composed.push(`Changeovevr ${familySelect.Changeovevr}`);
    if (hasRccb) composed.push(`RCCB ${familySelect.RCCB}`);
    if (hasMcbBox) composed.push(`Mcb Box ${familySelect.McbBox}`);
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
    setFixedQuantities({});
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

    const formatUnit = (unit: string) => {
      switch (unit.toLowerCase()) {
        case "pc":
          return unit === "1" ? "pc" : "pcs";
        default:
          return unit;
      }
    };

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
      const formattedLine = `• ${item.qty} ${formatUnit(item.unit)} : ${item.name} `;

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

    let message = "";

    message += `🔌 *JAMBH ELECTRICAL SERVICES*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📄 *Electrical Fitting Items Quotation*\n\n`;

    message += `Dear ${sanitizeUserText(customerName)},\n\n`;
    message += `Thank you for choosing *Jambh Electrical Services*. Below is list of items required for your electrical work:\n\n`;

    message += `📋 *ITEMS LIST*\n\n`;

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

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Visit Our Website:\n`;
    const loginUrl = `https://jambh-ell.vercel.app`;
    message += `${loginUrl}\n\n`;

    message += `💡 *Quality Products for Better Performance & Durability*\n\n`;
    message += `Thank you for your trust 🙏\n`;
    message += `⚡ Reliable • Professional • Trusted Service\n\n`;
    message += `— *Jambh Electrical Services*`;

    return message;
  };

  const onShareOnWhatsApp = () => {
    const message = formatWhatsAppMessage();
    const selectedCustomer = customers.find(
      (c) => c._id === selectedCustomerId,
    );
    const phoneNumber = selectedCustomer?.phone || "";

    const rawPhone = String(phoneNumber || "");
    const phones = (() => {
      const p = rawPhone.trim();
      if (!p) return [] as string[];
      if (p.startsWith("+")) return [p];
      if (p.startsWith("0")) return [`+91${p.substring(1)}`];
      return [`+91${p}`];
    })();

    if (!phones.length) {
      toast.error("Customer phone number not found");
      return;
    }

    setIsSendingWhatsApp(true);
    sendViaWaBot({ phones, message })
      .then((r) => {
        if (r.ok) {
          toast.success(
            `WhatsApp sent: ${Number(r.sent || 0)} | Failed: ${Number(r.failed || 0)}`,
          );
          setShowShareModal(false);
          setShowSharePopup(false);
        } else {
          toast.error(r.error || "Failed to send WhatsApp");
        }
      })
      .catch(() => {
        toast.error("Failed to send WhatsApp");
      })
      .finally(() => {
        setIsSendingWhatsApp(false);
      });
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
      <HeaderSection onPrint={printList} onClearAll={clearAll} />

      <FittingTypeSelector fitType={fitType} onFitTypeChange={setFitType} />

      <div className="max-sm:max-h-[85dvh] overflow-auto space-y-4">
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
          <FixedItemsSection
            fitType={fitType}
            fixedQuantities={fixedQuantities}
            familySelect={familySelect}
            wireUnitMode={wireUnitMode}
            onFixedQtyChange={onFixedQtyChange}
            onFamilySelectChange={(family, value) =>
              setFamilySelect((s) => ({ ...s, [family]: value }))
            }
            onWireUnitModeChange={setWireUnitMode}
            onApplyFixedToList={applyFixedToList}
          />
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
          <AddOtherItems
            itemName={itemName}
            qty={qty}
            unit={unit}
            onItemNameChange={setItemName}
            onQtyChange={setQty}
            onUnitChange={setUnit}
            onAddClick={onAddClick}
          />
        </ResponsiveAccordion>

        <SelectedItemsList
          items={items}
          onUpdateQty={updateQty}
          onRemoveItem={removeItem}
          onClearAll={clearAll}
          onShareClick={onShareClick}
          shareLine={shareLine}
        />
      </div>

      <SharePopup
        isOpen={showSharePopup}
        onClose={() => setShowSharePopup(false)}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onCustomerChange={setSelectedCustomerId}
        onShareClick={onSharePopupShare}
      />

      <ShareModal
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        onShareOnWhatsApp={onShareOnWhatsApp}
        onNativeShare={onNativeShare}
        onCopyToClipboard={onCopyToClipboard}
        isSending={isSendingWhatsApp}
      />
    </div>
  );
}
