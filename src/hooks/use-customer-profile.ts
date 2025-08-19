import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { sanityClient } from "@/lib/sanity";

interface ProfileFormData {
  name: string;
  phone: string;
  location: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const useCustomerProfile = () => {
  const { user, updateProfile, isLoading } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || "",
    phone: user?.phone || "",
    location: user?.location || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    // Password validation (only if changing password)
    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = "Current password is required";
      }

      if (!formData.newPassword) {
        newErrors.newPassword = "New password is required";
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = "Password must be at least 6 characters";
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setErrors((prev) => ({
          ...prev,
          image: "Image size must be less than 5MB",
        }));
        return;
      }

      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          image: "Please select a valid image file",
        }));
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Clear image error
      if (errors.image) {
        setErrors((prev) => ({ ...prev, image: "" }));
      }
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!profileImage) return null;

    setIsUploading(true);
    try {
      const imageAsset = await sanityClient.assets.upload(
        "image",
        profileImage,
        {
          filename: `profile-${user?.id}-${Date.now()}.${
            profileImage.type.split("/")[1]
          }`,
        }
      );
      return imageAsset._id;
    } catch (error) {
      console.error("Error uploading image:", error);
      setErrors((prev) => ({ ...prev, image: "Failed to upload image" }));
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let imageId = null;
      if (profileImage) {
        imageId = await uploadImage();
        if (!imageId) return; // Upload failed
      }

      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
      };

      if (imageId) {
        updateData.profileImage = imageId;
      }

      // Handle password change
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
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

      // Clear image states
      setProfileImage(null);
      setImagePreview(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        general: error.message || "Failed to update profile",
      }));
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
    setSuccess("");
    setIsEditing(false);
    setProfileImage(null);
    setImagePreview(null);
  };

  return {
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
  };
};
