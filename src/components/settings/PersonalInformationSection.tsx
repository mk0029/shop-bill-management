"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  KeyRound,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import AvatarCropModal from "@/components/settings/AvatarCropModal";
import { sanitizeUserText } from "@/constants/defaults";

type ProfileUser = {
  _id: string;
  id: string;
  customerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  profileImageUrl?: string;
  role?: string;
};

type HomeAddress = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
};

const emptyAddress: HomeAddress = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
};

export default function PersonalInformationSection({
  mode = "profile",
}: {
  mode?: "profile" | "password";
}) {
  const setUser = useAuthStore((state) => state.setUser);
  const authUser = useAuthStore((state) => state.user);
  const [user, setProfileUser] = useState<ProfileUser | null>(null);
  const [location, setLocation] = useState("");
  const [homeAddress, setHomeAddress] = useState<HomeAddress>(emptyAddress);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me/profile")
      .then((response) => response.json())
      .then((json) => {
        if (cancelled || !json?.success) return;
        const nextUser = json.user as ProfileUser;
        const nextAddress = (json.homeAddress || {}) as Partial<HomeAddress>;
        setProfileUser(nextUser);
        setLocation(nextUser.location || "");
        setHomeAddress({
          addressLine1: nextAddress.addressLine1 || "",
          addressLine2: nextAddress.addressLine2 || "",
          city: nextAddress.city || "",
          state: nextAddress.state || "",
          pincode: nextAddress.pincode || "",
          landmark: nextAddress.landmark || "",
        });
        setPreviewUrl(nextUser.profileImageUrl || "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode === "password") setPasswordOpen(true);
  }, [mode]);

  const lockedFields = useMemo(
    () => [
      {
        label: "Name",
        value: sanitizeUserText(user?.name || authUser?.name || "Not set"),
      },
      { label: "Email", value: user?.email || authUser?.email || "Not set" },
      { label: "Mobile", value: user?.phone || authUser?.phone || "Not set" },
    ],
    [authUser, user],
  );

  const openImagePicker = () => {
    fileInputRef.current?.click();
  };

  const onAvatarFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
  };

  const uploadCroppedProfileImage = async (blob: Blob) => {
    setBusy(true);
    try {
      const file = new File([blob], `profile-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!response.ok || !json?.success)
        throw new Error(json?.error || "Image upload failed");

      const saveResponse = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImageAssetId: json.assetId }),
      });
      const saveJson = await saveResponse.json();
      if (!saveResponse.ok || !saveJson?.success)
        throw new Error(saveJson?.error || "Failed to save profile picture");

      const nextUser = saveJson.user as ProfileUser;
      const nextUrl = nextUser.profileImageUrl || json.url;
      setProfileUser(nextUser);
      setPreviewUrl(nextUrl);
      setUser({
        ...(authUser as any),
        ...nextUser,
        profileImage: nextUrl,
      } as any);
      setCropOpen(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update profile photo",
      );
    } finally {
      setBusy(false);
    }
  };

  const removeProfileImage = async () => {
    if (!previewUrl || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeProfileImage: true }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Failed to remove profile picture");
      const nextUser = json.user as ProfileUser;
      setProfileUser(nextUser);
      setPreviewUrl("");
      setUser({ ...(authUser as any), ...nextUser, profileImage: "" } as any);
      toast.success("Profile photo removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove profile photo");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, homeAddress }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success)
        throw new Error(json?.error || "Failed to save profile");
      const nextUser = json.user as ProfileUser;
      setProfileUser(nextUser);
      if (json.homeAddress)
        setHomeAddress({
          ...emptyAddress,
          ...(json.homeAddress as Partial<HomeAddress>),
        });
      setPreviewUrl(nextUser.profileImageUrl || previewUrl);
      setUser({
        ...(authUser as any),
        ...nextUser,
        profileImage: nextUser.profileImageUrl,
      } as any);
      toast.success("Personal information saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile",
      );
    } finally {
      setBusy(false);
    }
  };

  const updateAddress = (key: keyof HomeAddress, value: string) => {
    setHomeAddress((current) => ({
      ...current,
      [key]: key === "pincode" ? value.replace(/\D/g, "").slice(0, 6) : value,
    }));
  };

  const requestOtp = async () => {
    setOtpBusy(true);
    setDevOtp("");
    try {
      const response = await fetch("/api/users/me/password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success)
        throw new Error(json?.error || "Failed to request OTP");
      if (json.devOtp) setDevOtp(String(json.devOtp));
      toast.success(json.message || "OTP requested");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to request OTP",
      );
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async () => {
    setOtpBusy(true);
    try {
      const response = await fetch("/api/users/me/password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", otp }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success)
        throw new Error(json?.error || "OTP verification failed");
      setOtpVerified(true);
      toast.success("Email verified");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "OTP verification failed",
      );
    } finally {
      setOtpBusy(false);
    }
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setOtpBusy(true);
    try {
      const response = await fetch("/api/users/me/password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", newPassword }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success)
        throw new Error(json?.error || "Failed to update password");
      setOtp("");
      setDevOtp("");
      setOtpVerified(false);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password",
      );
    } finally {
      setOtpBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {mode === "profile" ? (
        <>
          <section className="overflow-hidden border-y border-slate-800 bg-slate-950/60 sm:rounded-lg sm:border">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Locked Account Credentials
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                These fields are used by app logic and cannot be changed here.
              </p>
            </div>
            <div className="grid gap-0 divide-y divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {lockedFields.map((field) => (
                <div key={field.label} className="px-4 py-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    {field.label}
                  </div>
                  <div className="mt-1 break-words text-sm font-medium text-slate-100">
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden border-y border-slate-800 bg-slate-950/60 sm:rounded-lg sm:border">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Editable Personal Information
              </h2>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-9 w-9 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Label className="text-slate-200">Profile Picture</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Image is uploaded first, then saved with your profile.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {previewUrl ? (
                    <button
                      type="button"
                      onClick={removeProfileImage}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-500/35 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Image
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={openImagePicker}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                    {busy ? "Working..." : "Choose Image"}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    onAvatarFileChange(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-location" className="text-slate-200">
                    Location
                  </Label>
                  <Input
                    id="profile-location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Area, city, or service location"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address-line-1" className="text-slate-200">
                    Address Line 1
                  </Label>
                  <Input
                    id="address-line-1"
                    value={homeAddress.addressLine1}
                    onChange={(event) =>
                      updateAddress("addressLine1", event.target.value)
                    }
                    placeholder="House number and street"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address-line-2" className="text-slate-200">
                    Address Line 2
                  </Label>
                  <Input
                    id="address-line-2"
                    value={homeAddress.addressLine2}
                    onChange={(event) =>
                      updateAddress("addressLine2", event.target.value)
                    }
                    placeholder="Village, area, or colony"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address-city" className="text-slate-200">
                    City
                  </Label>
                  <Input
                    id="address-city"
                    value={homeAddress.city}
                    onChange={(event) =>
                      updateAddress("city", event.target.value)
                    }
                    placeholder="City"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address-state" className="text-slate-200">
                    State
                  </Label>
                  <Input
                    id="address-state"
                    value={homeAddress.state}
                    onChange={(event) =>
                      updateAddress("state", event.target.value)
                    }
                    placeholder="State"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address-pincode" className="text-slate-200">
                    Pincode
                  </Label>
                  <Input
                    id="address-pincode"
                    inputMode="numeric"
                    value={homeAddress.pincode}
                    onChange={(event) =>
                      updateAddress("pincode", event.target.value)
                    }
                    placeholder="6-digit pincode"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address-landmark" className="text-slate-200">
                    Landmark
                  </Label>
                  <Input
                    id="address-landmark"
                    value={homeAddress.landmark}
                    onChange={(event) =>
                      updateAddress("landmark", event.target.value)
                    }
                    placeholder="Nearby landmark"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
              </div>

              <Button
                onClick={saveProfile}
                loading={busy}
                className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
              >
                <Save className="h-4 w-4" />
                Save Personal Information
              </Button>
            </div>
          </section>
        </>
      ) : null}

      {mode === "password" ? (
        <section className="overflow-hidden border-y border-slate-800 bg-slate-950/60 sm:rounded-lg sm:border">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-100">Password</h2>
              <p className="mt-1 text-xs text-slate-500">
                Change your login password after email OTP verification.
              </p>
            </div>
            <Button
              onClick={() => setPasswordOpen(true)}
              className="gap-2 bg-slate-800 text-slate-100 hover:bg-slate-700"
            >
              <KeyRound className="h-4 w-4" />
              Update
            </Button>
          </div>
        </section>
      ) : null}

      <Modal
        isOpen={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Update Password"
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-white">
                  Secure password update
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  We verify your account email before changing the login
                  password.
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label className="text-slate-200">Email Verification</Label>
              <div className="text-xs text-slate-500">
                {user?.email || authUser?.email || "No email available"}
              </div>
            </div>
            <Button
              onClick={requestOtp}
              loading={otpBusy}
              className="gap-2 bg-slate-800 text-slate-100 hover:bg-slate-700"
            >
              <Mail className="h-4 w-4" />
              Send OTP
            </Button>
          </div>

          {devOtp ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Dev OTP: {devOtp}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="profile-otp" className="text-slate-200">
                OTP
              </Label>
              <Input
                id="profile-otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="6-digit code"
                className="border-slate-700 bg-slate-900 text-white"
              />
            </div>
            <Button
              onClick={verifyOtp}
              loading={otpBusy}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-slate-200">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                disabled={!otpVerified}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                className="border-slate-700 bg-slate-900 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-slate-200">
                Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                disabled={!otpVerified}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
                className="border-slate-700 bg-slate-900 text-white"
              />
            </div>
          </div>

          <Button
            onClick={updatePassword}
            disabled={!otpVerified}
            loading={otpBusy}
            className="gap-2 bg-red-600 text-white hover:bg-red-500"
          >
            <KeyRound className="h-4 w-4" />
            Update Password
          </Button>
        </div>
      </Modal>
      <AvatarCropModal
        open={cropOpen}
        imageSrc={cropSrc}
        onClose={() => {
          setCropOpen(false);
          if (cropSrc) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }}
        onConfirm={uploadCroppedProfileImage}
      />
    </div>
  );
}
