"use client";

import { useState, useEffect } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { locationOptions } from "@/app/admin/tools/fitting-items/constants";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { DuplicateAccountModal } from "./DuplicateAccountModal";
import { PendingRequestModal } from "./PendingRequestModal";
import { LoginRecoveryModal } from "./LoginRecoveryModal";
import {
  getStoredRegistration,
  storeRegistration,
  clearStoredRegistration,
  getDeviceFingerprint,
  REGISTRATION_TOKEN_EXPIRY_MS,
  STORAGE_KEY,
} from "@/lib/customer-registration";

interface RequestAccountFormProps {
  compact?: boolean;
}

export function RequestAccountForm({ compact = false }: RequestAccountFormProps) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
    customLocation: "",
    requestType: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  useEffect(() => {
    const stored = getStoredRegistration();
    if (stored) {
      setAlreadySubmitted(true);
      setSuccess("You have already submitted a registration request. Our team is reviewing it.");
    }
  }, []);

  const displayOptions = [
    ...locationOptions,
    { value: "other", label: "Other" },
  ];

  const resolvedLocation =
    form.location === "other"
      ? form.customLocation.trim()
      : form.location;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    if (!/^[6-9]/.test(phoneDigits)) {
      setError("Mobile number must start with 6, 7, 8, or 9");
      return;
    }

    setIsSubmitting(true);
    try {
      const deviceFingerprint = getDeviceFingerprint();
      const res = await fetch("/api/public/customers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: phoneDigits,
          email: form.email.trim().toLowerCase(),
          location: resolvedLocation,
          requestType: form.requestType,
          deviceFingerprint: deviceFingerprint || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "ACCOUNT_EXISTS") {
          setShowDuplicateModal(true);
          return;
        }
        if (data.code === "REQUEST_EXISTS") {
          setShowPendingModal(true);
          return;
        }
        if (data.code === "RATE_LIMITED") {
          setError("Too many attempts. Please try again later.");
          return;
        }
        if (data.code === "VALIDATION_ERROR") {
          const firstError = data.errors
            ? Object.values(data.errors).flat()[0]
            : data.message;
          setError(firstError || "Please check your input and try again.");
          return;
        }
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      storeRegistration({
        requestId: data.requestId,
        token: data.token,
        timestamp: Date.now(),
        expiresAt: new Date(data.expiresAt).getTime(),
      });

      setSuccess(
        "Your registration request has been submitted successfully. Our team will review your request and contact you shortly."
      );

      setForm({
        name: "",
        phone: "",
        email: "",
        location: "",
        customLocation: "",
        requestType: "",
      });
      setAlreadySubmitted(true);
    } catch {
      setError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadySubmitted && success) {
    return (
      <div className="space-y-4 text-center py-8">
        <div className="mx-auto w-14 h-14 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-green-400" />
        </div>
        <p className="text-[#B8C0CC] text-sm leading-relaxed max-w-md mx-auto">
          {success}
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="ra-name"
              className="mb-1.5 block text-sm font-medium text-[#E5E7EB]"
            >
              Full Name
            </label>
            <input
              id="ra-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Your full name"
              required
              disabled={isSubmitting}
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
            />
          </div>
          <div>
            <label
              htmlFor="ra-phone"
              className="mb-1.5 block text-sm font-medium text-[#E5E7EB]"
            >
              Mobile Number
            </label>
            <input
              id="ra-phone"
              type="text"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                }))
              }
              placeholder="10-digit mobile number"
              required
              disabled={isSubmitting}
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="ra-email"
              className="mb-1.5 block text-sm font-medium text-[#E5E7EB]"
            >
              Email Address
            </label>
            <input
              id="ra-email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="email@example.com"
              required
              disabled={isSubmitting}
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#E5E7EB]">
              Location
            </label>
            <Dropdown
              options={displayOptions}
              value={form.location}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, location: value }))
              }
              placeholder="Select your area"
              removeSearchForce
              closeOnOutsideClick={false}
            />
            {form.location === "other" && (
              <input
                value={form.customLocation}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    customLocation: e.target.value,
                  }))
                }
                placeholder="Enter your location"
                required
                disabled={isSubmitting}
                className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50 mt-2"
              />
            )}
            <input
              className="hidden"
              readOnly
              required
              value={resolvedLocation}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="ra-request-type"
            className="mb-1.5 block text-sm font-medium text-[#E5E7EB]"
          >
            Request Type
          </label>
          <input
            id="ra-request-type"
            value={form.requestType}
            onChange={(e) =>
              setForm((f) => ({ ...f, requestType: e.target.value }))
            }
            placeholder="e.g. New customer registration, service request"
            required
            disabled={isSubmitting}
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-400/15 bg-red-950/30 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 rounded-xl border border-green-500/15 bg-green-950/30 px-4 py-3">
            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-green-300 leading-relaxed">
              {success}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="glass-button-primary w-full rounded-xl h-11 text-sm font-semibold text-sky-200 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-all"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" />
              Submitting...
            </span>
          ) : (
            "Submit Registration Request"
          )}
        </button>
      </form>

      <DuplicateAccountModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onRequestRecovery={() => {
          setShowDuplicateModal(false);
          setShowRecoveryModal(true);
        }}
      />

      <PendingRequestModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
      />

      <LoginRecoveryModal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
      />
    </>
  );
}
