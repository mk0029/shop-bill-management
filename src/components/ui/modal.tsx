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
      mobileType="modal"
      zIndex={220}
      backCloseId={backCloseId || title}
    >
      {children}
    </BaseGlassModal>
  );
}
