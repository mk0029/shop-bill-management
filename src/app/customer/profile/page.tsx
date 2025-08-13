"use client";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import { useCustomerProfile } from "@/hooks/use-customer-profile";
import { ProfileHeader } from "@/components/customer/profile-header";
import { ProfileForm } from "@/components/customer/profile-form";

export default function CustomerProfile() {
  const {
    user,
    isLoading,
    isEditing,
    formData,
    errors,
    success,
    profileImage,
    imagePreview,
    isUploading,
    showCurrentPassword,
    showNewPassword,
    showConfirmPassword,
    setIsEditing,
    setShowCurrentPassword,
    setShowNewPassword,
    setShowConfirmPassword,
    handleInputChange,
    handleImageChange,
    handleSave,
    handleCancel,
  } = useCustomerProfile();

  return (
    <div className="space-y-6 max-md:pb-4">
      <ProfileHeader
        user={user}
        isEditing={isEditing}
        imagePreview={imagePreview}
        onEditToggle={() => setIsEditing(!isEditing)}
        onImageChange={handleImageChange}
      />

      <ProfileForm
        isEditing={isEditing}
        formData={formData}
        errors={errors}
        success={success}
        isLoading={isLoading}
        isUploading={isUploading}
        showCurrentPassword={showCurrentPassword}
        showNewPassword={showNewPassword}
        showConfirmPassword={showConfirmPassword}
        onInputChange={handleInputChange}
        onSave={handleSave}
        onCancel={handleCancel}
        setShowCurrentPassword={setShowCurrentPassword}
        setShowNewPassword={setShowNewPassword}
        setShowConfirmPassword={setShowConfirmPassword}
      />
    </div>
  );
}