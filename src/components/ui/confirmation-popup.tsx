"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { Card } from "./card";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Copy,
  CheckCircle2,
  X,
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
  autoClose?: number; // Auto close after X milliseconds
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
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);

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

  const getColorClasses = () => {
    switch (data.type) {
      case "success":
        return {
          border: "border-green-500/30",
          bg: "bg-gray-900",
          text: "text-green-200",
        };
      case "error":
        return {
          border: "border-red-500/30",
          bg: "bg-gray-900",
          text: "text-red-200",
        };
      case "warning":
        return {
          border: "border-yellow-500/30",
          bg: "bg-gray-900",
          text: "text-yellow-200",
        };
      case "info":
        return {
          border: "border-blue-500/30",
          bg: "bg-gray-900",
          text: "text-blue-200",
        };
      default:
        return {
          border: "border-gray-500/30",
          bg: "bg-gray-900",
          text: "text-gray-200",
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md">
              <Card
                className={`${colorClasses.bg} ${colorClasses.border} border shadow-2xl`}>
                <div className="p-3 md:p-6">
                  {/* Close Button */}
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="hover:bg-gray-800 p-1">
                      <X className="w-4 h-4" />
                    </Button>
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
                      className="flex justify-center mb-4">
                      {getIcon()}
                    </motion.div>

                    <h2
                      className={`text-xl font-bold ${colorClasses.text} mb-2`}>
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
                          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div>
                            <p className="text-gray-400 text-xs">
                              {detail.label}
                            </p>
                            <p className="text-white font-medium">
                              {detail.value}
                            </p>
                          </div>

                          {detail.copyable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(detail.value, detail.label)
                              }
                              className="hover:bg-gray-700 p-2">
                              {copiedField === detail.label ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
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
                          className="flex-1 flex items-center justify-center gap-2">
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
                        variant={
                          data.type === "error" ? "destructive" : "default"
                        }>
                        {data.type === "success" ? "Great!" : "OK"}
                      </Button>
                    )}
                  </div>

                  {/* Auto close indicator */}
                  {autoClose && (
                    <div className="mt-4 text-center">
                      <p className="text-gray-400 text-xs">
                        This popup will close automatically in{" "}
                        {Math.ceil(autoClose / 1000)} seconds
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
