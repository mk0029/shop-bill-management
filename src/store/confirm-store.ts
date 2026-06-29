import { create } from "zustand";
import type { ReactNode } from "react";

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "primary" | "warning";
  icon?: ReactNode;
  hideCancel?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  closeConfirm: () => void;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: {},
  resolve: null,

  showConfirm: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      set({ open: true, options, resolve });
    });
  },

  closeConfirm: () => {
    const { resolve } = get();
    set({ open: false, resolve: null, options: {} });
    if (resolve) resolve(false);
  },

  handleConfirm: () => {
    const { resolve } = get();
    set({ open: false, resolve: null, options: {} });
    if (resolve) resolve(true);
  },

  handleCancel: () => {
    const { resolve } = get();
    set({ open: false, resolve: null, options: {} });
    if (resolve) resolve(false);
  },
}));

// Convenience function for one-off use
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().showConfirm(options);
}
