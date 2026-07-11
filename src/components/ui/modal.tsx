"use client";

import { useEffect, useState } from "react";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  className?: string;
  backCloseId?: string;
  forceFullSize?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  className,
  backCloseId,
  forceFullSize,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      showCloseButton={showCloseButton}
      className={className}
      mobileType="center"
      zIndex={220}
      backCloseId={backCloseId || title}
      forceFullSize={forceFullSize}
    >
      {children}
    </BaseGlassModal>
  );
}
