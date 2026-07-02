"use client";

import { MessageSquare, Smartphone, Copy } from "lucide-react";
import { CentralShareModal } from "@/components/ui/central-share-modal";

interface ShareModalProps {
  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;
  onShareOnWhatsApp: () => void;
  onNativeShare: () => void;
  onCopyToClipboard: () => void;
  isSending?: boolean;
}

export function ShareModal({
  showShareModal,
  setShowShareModal,
  onShareOnWhatsApp,
  onNativeShare,
  onCopyToClipboard,
  isSending,
}: ShareModalProps) {
  return (
    <CentralShareModal
      isOpen={showShareModal}
      onClose={() => setShowShareModal(false)}
      title="Share Bill"
      actions={[
        {
          label: "WhatsApp",
          icon: MessageSquare,
          onClick: onShareOnWhatsApp,
          primary: true,
          disabled: isSending,
          loading: isSending,
        },
        {
          label: "Native Share",
          icon: Smartphone,
          onClick: onNativeShare,
          disabled: isSending,
        },
        {
          label: "Copy to Clipboard",
          icon: Copy,
          onClick: onCopyToClipboard,
          disabled: isSending,
        },
      ]}
    />
  );
}
