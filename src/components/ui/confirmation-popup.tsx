"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Copy,
  CheckCircle2,
} from "lucide-react";

export interface ConfirmationData {
  title: string;
  message: string;
  data?: unknown;
  type: "success" | "error" | "warning" | "info";
  details?: Array<{
    label: string;
    value: string;
    copyable?: boolean;
  }>;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: "default" | "outline" | "destructive";
    disabled?: boolean;
    loading?: boolean;
  }>;
}

interface ConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  data: ConfirmationData;
  autoClose?: number;
}

export function ConfirmationPopup({
  isOpen,
  onClose,
  data,
  autoClose,
}: ConfirmationPopupProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => onClose(), autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case "error":
        return <XCircle className="w-12 h-12 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
      case "info":
        return <Info className="w-12 h-12 text-blue-500" />;
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  return (
    <BaseGlassModal isOpen={isOpen} onClose={onClose} showCloseButton={false} mobileType="modal" size="sm" zIndex={220}>
      <div className="p-3 md:p-6">
        {/* Close Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
          >
            <div className="w-4 h-4" />
          </button>
        </div>

        {/* Icon and Title */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 200,
            }}
            className="flex justify-center mb-4"
          >
            {getIcon()}
          </motion.div>

          <h2 className="text-xl font-bold text-white mb-2">
            {data.title}
          </h2>

          <p className="text-gray-300 text-sm">{data.message}</p>
        </div>

        {/* Details */}
        {data.details && data.details.length > 0 && (
          <div className="space-y-3 mb-6">
            {data.details.map((detail, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10"
              >
                <div>
                  <p className="text-gray-400 text-xs">
                    {detail.label}
                  </p>
                  <p className="text-white font-medium">
                    {detail.value}
                  </p>
                </div>

                {detail.copyable && (
                  <button
                    onClick={() => handleCopy(detail.value, detail.label)}
                    className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    {copiedField === detail.label ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-white/40" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {data.actions && data.actions.length > 0 ? (
            data.actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "default"}
                onClick={action.action}
                disabled={action.disabled}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {action.loading && (
                  <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                )}
                {action.label}
              </Button>
            ))
          ) : (
            <Button
              onClick={onClose}
              className="w-full"
              variant={data.type === "error" ? "destructive" : "default"}
            >
              {data.type === "success" ? "Great!" : "OK"}
            </Button>
          )}
        </div>

        {/* Auto close indicator */}
        {autoClose && (
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-xs">
              This popup will close automatically in {Math.ceil(autoClose / 1000)} seconds
            </p>
          </div>
        )}
      </div>
    </BaseGlassModal>
  );
}
