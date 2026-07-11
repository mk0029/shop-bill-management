"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { LogIn, KeyRound, X } from "lucide-react";
import Link from "next/link";

interface DuplicateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestRecovery: () => void;
}

export function DuplicateAccountModal({
  isOpen,
  onClose,
  onRequestRecovery,
}: DuplicateAccountModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Already Exists"
      size="sm"
    >
      <div className="space-y-6 px-1">
        <p className="text-[#B8C0CC] text-sm leading-relaxed">
          An account with this email address or mobile number already exists.
          You can sign in immediately or recover your login credentials if you
          have forgotten them.
        </p>

        <div className="flex flex-col gap-2">
          <Link href="/login">
            <Button className="glass-button-primary w-full h-11 rounded-xl text-sky-200 font-semibold gap-2">
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          </Link>

          <button
            onClick={() => {
              onClose();
              onRequestRecovery();
            }}
            className="glass-button w-full h-11 rounded-xl text-[#B8C0CC] font-medium border border-white/10 hover:text-white transition-all gap-2 inline-flex items-center justify-center"
          >
            <KeyRound className="h-4 w-4" />
            Request Login Credentials
          </button>

          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl text-white/40 hover:text-white/70 text-sm transition-colors inline-flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
