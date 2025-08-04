"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";
import {
  User,
  Phone,
  MapPin,
  Lock,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";

export default function CustomerProfile() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const { t } = useLocaleStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    location: user?.location || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword =
          "Current password is required to change password";
      }
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = "New password must be at least 6 characters";
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
      };

      if (formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      await updateProfile(updateData);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);

      // Clear password fields
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setErrors({ general: "Failed to update profile. Please try again." });
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      phone: user?.phone || "",
      location: user?.location || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account information and security settings
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <User className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-900/50 border border-green-800 text-green-200 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {success}
        </motion.div>
      )}

      {/* Error Message */}
      {errors.general && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          {errors.general}
        </motion.div>
      )}

      {/* Profile Information */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-6">
          Account Information
        </h2>

        <div className="space-y-6">
          {/* Customer ID (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Customer ID
            </label>
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-white font-mono">
                {user?.clerkId || "N/A"}
              </span>
              <span className="text-xs text-gray-500 ml-auto">Read-only</span>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={!isEditing}
                className={`pl-10 ${errors.name ? "border-red-500" : ""}`}
                placeholder="Enter your full name"
              />
            </div>
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                disabled={!isEditing}
                className="pl-10"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                disabled={!isEditing}
                className="pl-10"
                placeholder="Enter your location"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Password Change Section */}
      {isEditing && (
        <Card className="p-6 bg-gray-900 border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-6">
            Change Password
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Leave password fields empty if you don't want to change your
            password
          </p>

          <div className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={(e) =>
                    handleInputChange("currentPassword", e.target.value)
                  }
                  className={`pl-10 pr-10 ${
                    errors.currentPassword ? "border-red-500" : ""
                  }`}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.currentPassword && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) =>
                    handleInputChange("newPassword", e.target.value)
                  }
                  className={`pl-10 pr-10 ${
                    errors.newPassword ? "border-red-500" : ""
                  }`}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.newPassword && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className={`pl-10 pr-10 ${
                    errors.confirmPassword ? "border-red-500" : ""
                  }`}
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
