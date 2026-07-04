"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Zap,
  Cpu,
  Wrench,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { RewindingKitForm } from "@/components/billing/RewindingKitForm";
import FittingForm from "@/components/billing/FittingForm";

interface ServicesStepProps {
  onAddCustomItem: (item: {
    productName: string;
    quantity: number;
    unitPrice: number;
    specifications?: string;
    category?: string;
    brand?: string;
    unit?: string;
  }) => void;
  onServiceAdded: () => void;
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const OPTIONAL_CARDS = [
  { id: "home_visit", label: "Visiting Fee", icon: Home, desc: "Add visiting fee", feeField: "visitingCharges" as const, defaultAmount: 200 },
  { id: "rewinding", label: "Rewinding", icon: Zap, desc: "Add rewinding services & items", hasForm: true },
  { id: "fitting", label: "Fitting/Wiring", icon: Cpu, desc: "Add fitting & wiring services", hasForm: true },
  { id: "service_charge", label: "Service Charge", icon: Wrench, desc: "Additional service/labour charge", feeField: "repairFee" as const, defaultAmount: 100 },
];

const cardBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "16px",
};

const cardActive: React.CSSProperties = {
  background: "rgba(56,189,248,0.08)",
  border: "1px solid rgba(56,189,248,0.25)",
  borderRadius: "16px",
};

export function ServicesStep({
  onAddCustomItem,
  onServiceAdded,
  formData,
  onInputChange,
}: ServicesStepProps) {
  const [expandedServices, setExpandedServices] = useState<string[]>([]);
  const [customCharge, setCustomCharge] = useState({ label: "", amount: 0 });

  const serviceType = formData.serviceType || "";
  const location = formData.location || "";
  const isShopLocation = location === "shop";
  const isRepairService = serviceType === "repair";
  const hideLocationCharges = isShopLocation;
  const visitLocationLabel =
    location === "factory"
      ? "Factory Visit"
      : location === "office"
        ? "Office Visit"
        : "Home Visit";
  const serviceChargeLabel = isRepairService ? "Repair Charges" : "Service Charge";
  const serviceChargeDesc = isRepairService
    ? "Select repair charge amount"
    : "Add service/labour charge amount";

  useEffect(() => {
    if (hideLocationCharges && Number(formData.visitingCharges || 0) > 0) {
      onInputChange("visitingCharges", 0);
    }
  }, [formData.visitingCharges, hideLocationCharges, onInputChange]);

  useEffect(() => {
    if (isRepairService || Number(formData.repairFee || 0) > 0) {
      setExpandedServices((prev) => prev.includes("service_charge") ? prev : [...prev, "service_charge"]);
    }
  }, [formData.repairFee, isRepairService]);

  useEffect(() => {
    if (!hideLocationCharges && location) {
      setExpandedServices((prev) => prev.includes("home_visit") ? prev : [...prev, "home_visit"]);
    } else {
      setExpandedServices((prev) => prev.filter((id) => id !== "home_visit"));
    }
  }, [hideLocationCharges, location]);
  const visibleOptionalCards = useMemo(
    () =>
      OPTIONAL_CARDS.filter((card) => {
        if (card.id === "home_visit") return !hideLocationCharges;
        return true;
      }),
    [hideLocationCharges],
  );

  const includedServices = useMemo(() => {
    const labels: string[] = [];
    if (serviceType === "repair") labels.push("Repair");
    if (serviceType === "installation") labels.push("Installation");
    if (serviceType === "fitting_wiring") labels.push("Fitting/Wiring");
    if (serviceType === "maintenance") labels.push("Maintenance");
    if (serviceType === "sale") labels.push("Sale");
    return labels;
  }, [serviceType]);

  const isActive = (cardId: string) => {
    if (cardId === "home_visit") return Number(formData.visitingCharges || 0) > 0;
    if (cardId === "service_charge") return Number(formData.repairFee || 0) > 0;
    return false;
  };

  const toggleExpandedCard = (cardId: string) => {
    setExpandedServices((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  };

  const toggleCard = (cardId: string) => {
    if (cardId === "home_visit" || cardId === "service_charge" || cardId === "rewinding" || cardId === "fitting") {
      toggleExpandedCard(cardId);
    }
  };

  const addCustomCharge = () => {
    if (!customCharge.label.trim() || customCharge.amount <= 0) return;
    onAddCustomItem({
      productName: customCharge.label,
      quantity: 1,
      unitPrice: customCharge.amount,
      category: "Services",
      unit: "pcs",
    });
    setCustomCharge({ label: "", amount: 0 });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm mb-2" style={{ color: "rgba(148,163,184,0.6)" }}>
        Select optional add-ons to include in this bill
      </p>

      {/* Included services hint */}
      {includedServices.length > 0 && (
        <div
          className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs"
          style={{
            background: "rgba(56,189,248,0.06)",
            border: "1px solid rgba(56,189,248,0.1)",
          }}
        >
          <Wrench className="w-3.5 h-3.5" style={{ color: "rgba(56,189,248,0.5)" }} />
          <span style={{ color: "rgba(148,163,184,0.7)" }}>
            Already included from service type:
          </span>
          {includedServices.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: "rgba(56,189,248,0.1)",
                color: "rgba(56,189,248,0.7)",
                border: "1px solid rgba(56,189,248,0.12)",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Optional service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {visibleOptionalCards.map((card) => {
          const Icon = card.icon;
          const active = isActive(card.id);
          const expanded = expandedServices.includes(card.id);
          const focused = active || expanded;
          const isServiceCharge = card.id === "service_charge";
          const isVisitCharge = card.id === "home_visit";
          const cardLabel = isServiceCharge ? serviceChargeLabel : isVisitCharge ? "Visiting Fee" : card.label;
          const cardDesc = isServiceCharge ? serviceChargeDesc : isVisitCharge ? `${visitLocationLabel} selected from Step 1` : card.desc;
          return (
            <motion.div
              key={card.id}
              layout
              style={focused ? cardActive : cardBase}
              className="overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleCard(card.id)}
                className="w-full flex items-center gap-3 p-3.5 text-left"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: focused ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${focused ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: focused ? "rgba(56,189,248,0.8)" : "rgba(148,163,184,0.5)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: focused ? "rgba(56,189,248,0.9)" : "rgba(255,255,255,0.8)" }}>
                    {cardLabel}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>
                    {cardDesc}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {active && (
                    <div className="w-2 h-2 rounded-full" style={{ background: "rgba(52,211,153,0.7)" }} />
                  )}
                  {(card.hasForm || isServiceCharge || isVisitCharge) && (
                    expanded ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(148,163,184,0.4)" }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: "rgba(148,163,184,0.4)" }} />
                  )}
                </div>
              </button>

              {(card.hasForm || isServiceCharge || isVisitCharge) && expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    {card.id === "rewinding" && (
                      <RewindingKitForm onAddItem={onAddCustomItem} onSubmitted={onServiceAdded} />
                    )}
                    {card.id === "fitting" && (
                      <FittingForm onAddItem={onAddCustomItem} onSubmitted={onServiceAdded} />
                    )}
                    {isVisitCharge && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          type="number"
                          min={0}
                          value={formData.visitingCharges || ""}
                          onChange={(e) => onInputChange("visitingCharges", e.target.value)}
                          placeholder={`Visiting Fee (${visitLocationLabel})`}
                          className="min-w-0 text-white text-xs px-3 py-2 outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => onInputChange("visitingCharges", 0)}
                          disabled={Number(formData.visitingCharges || 0) <= 0}
                          className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(148,163,184,0.75)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            opacity: Number(formData.visitingCharges || 0) <= 0 ? 0.45 : 1,
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    {isServiceCharge && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          type="number"
                          min={0}
                          value={formData.repairFee || ""}
                          onChange={(e) => onInputChange("repairFee", e.target.value)}
                          placeholder={serviceChargeLabel}
                          className="min-w-0 text-white text-xs px-3 py-2 outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => onInputChange("repairFee", 0)}
                          disabled={Number(formData.repairFee || 0) <= 0}
                          className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(148,163,184,0.75)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            opacity: Number(formData.repairFee || 0) <= 0 ? 0.45 : 1,
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Custom charge */}
      <motion.div
        layout
        style={cardBase}
        className="overflow-hidden"
      >
        <button
          type="button"
          onClick={() => toggleExpandedCard("_custom")}
          className="w-full flex items-center gap-3 p-3.5 text-left"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Plus className="w-4.5 h-4.5" style={{ color: "rgba(148,163,184,0.5)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
              Other Custom Charge
            </div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>
              Add a one-time custom charge (labour, parts handling, etc.)
            </div>
          </div>
          {expandedServices.includes("_custom") ? (
            <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "rgba(148,163,184,0.4)" }} />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "rgba(148,163,184,0.4)" }} />
          )}
        </button>

        {expandedServices.includes("_custom") && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
                <input
                  type="text"
                  value={customCharge.label}
                  onChange={(e) => setCustomCharge((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Charge name (e.g. Labour)"
                  className="min-w-0 text-white text-xs px-3 py-2 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                  }}
                />
                <input
                  type="number"
                  min={0}
                  value={customCharge.amount || ""}
                  onChange={(e) => setCustomCharge((p) => ({ ...p, amount: Number(e.target.value) || 0 }))}
                  placeholder="Amount"
                  className="min-w-0 text-white text-xs px-3 py-2 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomCharge}
                  disabled={!customCharge.label.trim() || customCharge.amount <= 0}
                  className="px-3 py-2 rounded-xl text-xs font-medium transition-all sm:shrink-0"
                  style={{
                    background: "rgba(56,189,248,0.15)",
                    color: "rgba(56,189,248,0.9)",
                    border: "1px solid rgba(56,189,248,0.2)",
                    opacity: !customCharge.label.trim() || customCharge.amount <= 0 ? 0.4 : 1,
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}







