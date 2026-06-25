"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginCredentials } from "@/types";
import { Eye, EyeOff, Phone, Lock } from "lucide-react";

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  initialValues?: {
    phone?: string;
    secretKey?: string;
  };
}

export function LoginForm({
  onSubmit,
  isLoading = false,
  error,
  initialValues = {},
}: LoginFormProps) {
  const [formData, setFormData] = useState<LoginCredentials>({
    phone: initialValues?.phone || "",
    secretKey: initialValues?.secretKey || "",
    rememberMe: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<LoginCredentials>>({});
  const [showPassword, setShowPassword] = useState(false);
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    const hasQuery =
      typeof window !== "undefined" &&
      typeof window.location?.search === "string" &&
      window.location.search.length > 1;

    if (!hasQuery) return;
    if (hasAutoSubmitted.current) return;
    if (isLoading) return;

    const phoneFilled = !!formData.phone?.trim();
    const secretFilled = !!formData.secretKey?.trim();
    if (!phoneFilled || !secretFilled) return;

    const isPhoneValid = /^\+?[1-9]\d{1,14}$/.test(formData.phone.trim());
    const isSecretValid = formData.secretKey.trim().length > 0;
    if (!isPhoneValid || !isSecretValid) return;

    hasAutoSubmitted.current = true;
    onSubmit(formData).catch((err) => {
      console.error("Auto login failed:", err);
      hasAutoSubmitted.current = false;
    });
  }, [formData, isLoading, onSubmit]);

  const validateForm = (): boolean => {
    const errors: Partial<LoginCredentials> = {};
    const phoneRaw = formData.phone.trim();

    if (!phoneRaw) {
      errors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(phoneRaw)) {
      errors.phone = "Enter a valid 10-digit mobile number";
    } else if (!/^[6-9]/.test(phoneRaw)) {
      errors.phone = "Indian mobile number must start with 6, 7, 8, or 9";
    }

    if (!formData.secretKey.trim()) {
      errors.secretKey = "Secret key is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setFormData((prev: LoginCredentials) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev: Partial<LoginCredentials>) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-md:space-y-4" noValidate>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-[#B8C0CC] font-medium text-sm">
            Phone Number
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B8C0CC]/50 w-4 h-4 z-10" />
            <Input
              id="phone"
              type="text"
              inputMode="numeric"
              placeholder="Enter 10-digit mobile number"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              disabled={isLoading}
              className={`glass-input pl-10 text-white placeholder:text-[#B8C0CC]/50 ${
                formErrors.phone
                  ? "border-red-500/50 focus:border-red-500"
                  : ""
              }`}
            />
          </div>
          {formErrors.phone && (
            <p className="text-red-400 text-sm mt-1">{formErrors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="secretKey" className="text-[#B8C0CC] font-medium text-sm">
            Secret Key
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B8C0CC]/50 w-4 h-4 z-10" />
            <Input
              id="secretKey"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your secret key"
              value={formData.secretKey}
              onChange={(e) => handleInputChange("secretKey", e.target.value)}
              disabled={isLoading}
              className={`glass-input pl-10 pr-10 text-white placeholder:text-[#B8C0CC]/50 ${
                formErrors.secretKey
                  ? "border-red-500/50 focus:border-red-500"
                  : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#B8C0CC]/50 hover:text-[#E5E7EB]"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {formErrors.secretKey && (
            <p className="text-red-400 text-sm mt-1">{formErrors.secretKey}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="rememberMe"
          type="checkbox"
          className="h-4 w-4 rounded border-white/10 bg-white/5 text-sky-500 focus:ring-white/30"
          checked={!!formData.rememberMe}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, rememberMe: e.target.checked }))
          }
          disabled={isLoading}
        />
        <Label htmlFor="rememberMe" className="text-[#B8C0CC] text-sm">
          Remember me
        </Label>
      </div>

      <Button
        type="submit"
        className="glass-button-primary w-full h-11 rounded-2xl text-sky-200 font-semibold shadow-none"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-200 mr-2"></div>
            Signing in...
          </div>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
