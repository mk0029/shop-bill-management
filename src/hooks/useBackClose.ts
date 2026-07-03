"use client";

import { useEffect, useRef } from "react";
import { modalStack } from "@/lib/modal-stack";

type UseBackCloseOptions = {
  isOpen: boolean;
  onClose: () => void;
  id: string;
};

export function useBackClose({ isOpen, onClose, id }: UseBackCloseOptions) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const token = modalStack.push({
      id,
      close: () => closeRef.current(),
    });

    return () => {
      modalStack.remove(token);
    };
  }, [id, isOpen]);
}

