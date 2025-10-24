"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  type?: "confirm" | "alert" | "success" | "error";
  confirmText?: string;
  cancelText?: string;
  content?: React.ReactNode; // optional rich content area
  size?: "sm" | "md" | "lg" | "xl" | "full"; // forwarded to Modal
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "confirm",
  confirmText = "Confirm",
  cancelText = "Cancel",
  content,
  size = "sm",
}: ConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const getIcon = () => {
    switch (type) {
      case "alert":
      case "confirm":
        return (
          <AlertTriangle className=" h-6 w-6 sm:w-8 sm:h-8  text-yellow-500" />
        );
      case "success":
        return (
          <CheckCircle className=" h-6 w-6 sm:w-8 sm:h-8  text-green-500" />
        );
      case "error":
        return <XCircle className=" h-6 w-6 sm:w-8 sm:h-8  text-red-500" />;
      default:
        return <Info className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-500" />;
    }
  };

  const getButtonVariant = () => {
    switch (type) {
      case "success":
        return "default";
      case "error":
        return "destructive";
      default:
        return "default";
    }
  };

  const handleConfirm = async () => {
    if (isConfirming) return;
    try {
      setIsConfirming(true);
      await onConfirm?.();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = async () => {
    if (isClosing) return;
    try {
      setIsClosing(true);
      await onClose?.();
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={size} title="">
      <div className="text-center space-y-4">
        <div className="flex justify-center">{getIcon()}</div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          {message && <p className="text-gray-400">{message}</p>}
        </div>

        {content && (
          <div className="text-left bg-gray-900/50 border border-gray-800 rounded-md p-3">
            {content}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {type === "confirm" && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isConfirming || isClosing}
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant={getButtonVariant()}
            onClick={handleConfirm}
            className="flex-1"
            disabled={isConfirming || isClosing}
          >
            {type === "confirm" ? (isConfirming ? "Processing..." : confirmText) : isConfirming ? "Processing..." : "OK"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
