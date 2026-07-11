"use client";

import { Modal } from "@/components/ui/modal";
import { MessageCircle, X } from "lucide-react";
import { getSupportContact } from "@/lib/auth-service";

interface PendingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PendingRequestModal({
  isOpen,
  onClose,
}: PendingRequestModalProps) {
  const support = getSupportContact();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registration Already Submitted"
      size="sm"
    >
      <div className="space-y-6 px-1">
        <p className="text-[#B8C0CC] text-sm leading-relaxed">
          We have already received a registration request using this email
          address or mobile number. Our team is currently reviewing your
          request. Submitting another request is unnecessary.
        </p>

        <p className="text-[#B8C0CC] text-sm leading-relaxed">
          If you need help, please contact support.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href={`https://wa.me/${support.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="glass-button w-full h-11 rounded-xl text-[#B8C0CC] font-medium border border-white/10 hover:text-white transition-all gap-2 inline-flex items-center justify-center">
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </button>
          </a>

          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl text-white/40 hover:text-white/70 text-sm transition-colors inline-flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
