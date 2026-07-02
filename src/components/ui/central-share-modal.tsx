"use client";

import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Smartphone, Copy, Link } from "lucide-react";
import { toast } from "sonner";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { Button } from "@/components/ui/button";

interface ShareAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  loadingLabel?: string;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

interface CentralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  shareText?: string;
  shareUrl?: string;
  whatsappText?: string;
  copyText?: string;
  customerPhone?: string;
  billId?: string;
  actions?: ShareAction[];
  isLoading?: boolean;
}

export const CentralShareModal = memo(function CentralShareModal({
  isOpen,
  onClose,
  title = "Share",
  description,
  shareText,
  shareUrl,
  whatsappText,
  copyText,
  customerPhone,
  billId,
  actions: customActions,
  isLoading,
}: CentralShareModalProps) {
  const handleCopyLink = useCallback(() => {
    const text = shareUrl || shareText || "";
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard");
      onClose();
    }
  }, [shareUrl, shareText, onClose]);

  const handleCopyText = useCallback(() => {
    const text = copyText || shareText || "";
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text);
      toast.success("Text copied to clipboard");
      onClose();
    }
  }, [copyText, shareText, onClose]);

  const handleWhatsAppShare = useCallback(() => {
    const text = encodeURIComponent(whatsappText || shareText || "");
    const phone = customerPhone
      ? `91${customerPhone.replace(/\D/g, "").slice(-10)}`
      : "";
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    onClose();
  }, [whatsappText, shareText, customerPhone, onClose]);

  const handleNativeShare = useCallback(() => {
    const data: ShareData = {};
    if (shareText) data.text = shareText;
    if (shareUrl) data.url = shareUrl;
    if (navigator.share && Object.keys(data).length) {
      navigator.share(data).catch(() => {});
      onClose();
    } else {
      handleCopyText();
    }
  }, [shareText, shareUrl, handleCopyText, onClose]);

  const defaultActions: ShareAction[] = [
    ...(shareUrl
      ? [{ label: "Copy Link", icon: Link, onClick: handleCopyLink }]
      : []),
    ...(shareText || copyText
      ? [{ label: "Copy Text", icon: Copy, onClick: handleCopyText }]
      : []),
    ...(whatsappText || shareText
      ? [
          {
            label: "WhatsApp",
            icon: MessageSquare,
            onClick: handleWhatsAppShare,
            primary: true,
          },
        ]
      : []),
    {
      label: "Native Share",
      icon: Smartphone,
      onClick: handleNativeShare,
    },
  ];

  const actions = customActions || defaultActions;

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      zIndex={400}
    >
      <div className="p-5 sm:p-6 space-y-4">
        {description && (
          <p className="text-sm text-white/50 text-center">{description}</p>
        )}

        <div className="space-y-2">
          {actions.map((action, i) => {
            const Icon = action.icon;
            const loading = action.loading || isLoading;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
              >
                <Button
                  onClick={action.onClick}
                  disabled={action.disabled || isLoading}
                  className={`w-full !rounded-xl !py-3 flex items-center gap-3 ${
                    action.primary
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0"
                      : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  {loading ? action.loadingLabel || "Please wait..." : action.label}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-white/30 hover:text-white/50 py-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </BaseGlassModal>
  );
});