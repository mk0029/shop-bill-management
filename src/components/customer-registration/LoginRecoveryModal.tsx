"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Send, ArrowLeft, CheckCircle, MessageCircle } from "lucide-react";

interface LoginRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginRecoveryModal({
  isOpen,
  onClose,
}: LoginRecoveryModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "whatsapp">("email");
  const [error, setError] = useState("");

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isPhone = /^[6-9]\d{9}$/.test(identifier.replace(/\D/g, ""));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleaned = identifier.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
    const validPhone = /^[6-9]\d{9}$/.test(cleaned.replace(/\D/g, ""));

    if (!validEmail && !validPhone) {
      setError("Enter a valid email address or 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/public/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleaned }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "RECOVERY_RATE_LIMITED" || data.code === "RATE_LIMITED") {
          setError("Too many attempts. Please try again later.");
        } else if (data.code === "USER_NOT_FOUND") {
          setError("No account found with that email address or mobile number. Please check your information and try again.");
        } else {
          setError(data.message || "Something went wrong. Please try again.");
        }
        return;
      }

      setDeliveryMethod(data.method || "email");
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIdentifier("");
    setSubmitted(false);
    setDeliveryMethod("email");
    setError("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Request Login Credentials"
      size="sm"
    >
      <div className="space-y-6 px-1">
        {submitted ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-[#B8C0CC] text-sm leading-relaxed">
              {deliveryMethod === "whatsapp" ? (
                <>Your login credentials have been sent via WhatsApp. Please check your messages.</>
              ) : (
                <>Your login credentials have been sent to your email. Please check your inbox.</>
              )}
            </p>
            <div className="flex items-center justify-center gap-2 text-[#B8C0CC]/60 text-xs">
              {deliveryMethod === "whatsapp" ? (
                <><MessageCircle className="w-3.5 h-3.5" /> Delivered via WhatsApp</>
              ) : (
                <><Mail className="w-3.5 h-3.5" /> Delivered via Email</>
              )}
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="glass-button w-full h-11 rounded-xl text-[#B8C0CC] font-medium border border-white/10 hover:text-white transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-[#B8C0CC] text-sm leading-relaxed">
              Enter your registered email address or mobile number and we will
              send your login credentials.
            </p>

            <div>
              <label
                htmlFor="recovery-identifier"
                className="mb-1.5 block text-sm font-medium text-[#E5E7EB]"
              >
                Email or Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8C0CC]/50">
                  {isEmail ? (
                    <Mail className="w-4 h-4" />
                  ) : isPhone ? (
                    <Phone className="w-4 h-4" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </div>
                <input
                  id="recovery-identifier"
                  type="text"
                  inputMode={isPhone ? "numeric" : "email"}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  placeholder="email@example.com or 9876543210"
                  required
                  disabled={isSubmitting}
                  className="glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50 border border-white/10 focus:border-sky-400/30 focus:outline-none transition-colors"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-1.5">{error}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="glass-button-primary w-full h-11 rounded-xl text-sky-200 font-semibold gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Recovery Instructions
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="w-full h-11 rounded-xl text-white/40 hover:text-white/70 text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
