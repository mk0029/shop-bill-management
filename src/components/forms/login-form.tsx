"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginCredentials } from "@/types";
import { Eye, EyeOff, User, Lock } from "lucide-react";

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export function LoginForm({
  onSubmit,
  isLoading = false,
  error,
}: LoginFormProps) {
  const [formData, setFormData] = useState<LoginCredentials>({
    customerId: "",
    secretKey: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<LoginCredentials>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const errors: Partial<LoginCredentials> = {};

    if (!formData.customerId.trim()) {
      errors.customerId = "Customer ID is required";
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
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev: Partial<LoginCredentials>) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerId" className="text-gray-300 font-medium">
            Customer ID
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="customerId"
              type="text"
              placeholder="Enter your customer ID"
              value={formData.customerId}
              onChange={(e) => handleInputChange("customerId", e.target.value)}
              disabled={isLoading}
              className={`pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500  ${
                formErrors.customerId
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
            />
          </div>
          {formErrors.customerId && (
            <p className="text-red-400 text-sm mt-1">{formErrors.customerId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="secretKey" className="text-gray-300 font-medium">
            Secret Key
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="secretKey"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your secret key"
              value={formData.secretKey}
              onChange={(e) => handleInputChange("secretKey", e.target.value)}
              disabled={isLoading}
              className={`pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500  ${
                formErrors.secretKey
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
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

      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Signing in...
          </div>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
