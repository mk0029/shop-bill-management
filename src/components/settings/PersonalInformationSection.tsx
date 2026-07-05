"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
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

type ResetStep = 1 | 2 | 3;
type OtpChannel = "whatsapp" | "email";

function maskPhone(value?: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length <= 5) return digits || "Not available";
  return `${digits.slice(0, 5)}${"X".repeat(Math.min(5, digits.length - 5))}`;
}

function maskEmail(value?: string) {
  const email = String(value || "").trim();
  const [name, domain] = email.split("@");
  if (!name || !domain) return "Not available";
  return `${name.slice(0, Math.min(7, name.length))}***@${domain}`;
}

function passwordScore(value: string) {
  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

export default function PersonalInformationSection({
  mode = "profile",
}: {
  mode?: "profile" | "password";
}) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const authUser = useAuthStore((state) => state.user);
  const [user, setProfileUser] = useState<ProfileUser | null>(null);
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [homeAddress, setHomeAddress] = useState<HomeAddress>(emptyAddress);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [otpRequestBusy, setOtpRequestBusy] = useState(false);
  const [otpVerifyBusy, setOtpVerifyBusy] = useState(false);
  const [passwordUpdateBusy, setPasswordUpdateBusy] = useState(false);
  const [currentStep, setCurrentStep] = useState<ResetStep>(1);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("whatsapp");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [wizardError, setWizardError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me/profile")
      .then((response) => response.json())
      .then((json) => {
        if (cancelled || !json?.success) return;
        const nextUser = json.user as ProfileUser;
        const nextAddress = (json.homeAddress || {}) as Partial<HomeAddress>;
        setProfileUser(nextUser);
        setEmail(nextUser.email || "");
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

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const lockedFields = useMemo(
    () => [
      {
        label: "Name",
        value: sanitizeUserText(user?.name || authUser?.name || "Not set"),
      },
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
      formData.append(
        "userId",
        (authUser as any)?._id || (authUser as any)?.id || "",
      );
      const response = await fetch("/api/upload/profile", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Image upload failed");

      const saveResponse = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: json.url }),
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
      if (!response.ok || !json?.success)
        throw new Error(json?.error || "Failed to remove profile picture");
      const nextUser = json.user as ProfileUser;
      setProfileUser(nextUser);
      setPreviewUrl("");
      setUser({ ...(authUser as any), ...nextUser, profileImage: "" } as any);
      toast.success("Profile photo removed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove profile photo",
      );
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
        body: JSON.stringify({ email, location, homeAddress }),
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

  const phoneValue = user?.phone || authUser?.phone || "";
  const emailValue = user?.email || authUser?.email || "";
  const selectedDestination =
    otpChannel === "whatsapp" ? maskPhone(phoneValue) : maskEmail(emailValue);
  const strength = passwordScore(newPassword);
  const strengthLabel = ["Too weak", "Basic", "Fair", "Good", "Strong"][
    strength
  ];
  const passwordWizardOpen =
    mode === "password" ||
    passwordOpen ||
    otpSent ||
    otpVerified ||
    currentStep > 1 ||
    resetComplete ||
    otpRequestBusy ||
    otpVerifyBusy ||
    passwordUpdateBusy;

  const requestOtp = async () => {
    if (otpChannel === "whatsapp" && !phoneValue) {
      setWizardError("No mobile number is available for this account.");
      toast.error("No mobile number is available for this account");
      return;
    }
    if (otpChannel === "email" && !emailValue) {
      setWizardError("Add an email address in Personal Information first.");
      toast.error("Add an email address in Personal Information first");
      return;
    }
    setOtpRequestBusy(true);
    setWizardError("");
    setDevOtp("");
    setOtpVerified(false);
    try {
      const response = await fetch("/api/users/me/password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", channel: otpChannel }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success)
        throw new Error(json?.error || "Failed to request OTP");
      if (json.devOtp) setDevOtp(String(json.devOtp));
      setOtpSent(true);
      setOtp("");
      setResendSeconds(30);
      setCurrentStep(2);
      toast.success("Verification code sent successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to request OTP";
      setWizardError(message);
      toast.error(message);
    } finally {
      setOtpRequestBusy(false);
    }
  };

  const verifyOtp = async () => {
    const cleanOtp = otp.replace(/\D/g, "");
    if (!/^\d{6}$/.test(cleanOtp)) {
      setWizardError("Enter a valid 6-digit OTP.");
      toast.error("Enter a valid 6-digit OTP");
      return;
    }
    setOtpVerifyBusy(true);
    setWizardError("");
    try {
      const response = await fetch("/api/users/me/password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", otp: cleanOtp }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success)
        throw new Error(json?.error || "OTP verification failed");
      setPasswordOpen(true);
      setOtpVerified(true);
      setCurrentStep(3);
      toast.success("OTP verified");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OTP verification failed";
      setWizardError(message);
      toast.error(message);
    } finally {
      setOtpVerifyBusy(false);
    }
  };

  const updatePassword = async () => {
    if (!otpVerified) {
      setWizardError("Verify OTP before updating password.");
      toast.error("Verify OTP before updating password");
      return;
    }
    if (newPassword.length < 6) {
      setWizardError("Password must be at least 6 characters.");
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setWizardError("Passwords do not match.");
      toast.error("Passwords do not match");
      return;
    }
    setPasswordUpdateBusy(true);
    setWizardError("");
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
      setOtpSent(false);
      setResendSeconds(0);
      setNewPassword("");
      setConfirmPassword("");
      setResetComplete(true);
      toast.success("Password updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update password";
      setWizardError(message);
      toast.error(message);
    } finally {
      setPasswordUpdateBusy(false);
    }
  };

  const resetPasswordWizard = () => {
    setPasswordOpen(false);
    setOtpRequestBusy(false);
    setOtpVerifyBusy(false);
    setPasswordUpdateBusy(false);
    setCurrentStep(1);
    setOtpSent(false);
    setOtp("");
    setDevOtp("");
    setOtpVerified(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setResetComplete(false);
    setWizardError("");
    setResendSeconds(0);
  };

  const closePasswordModal = () => {
    if (mode === "password") {
      router.back();
      return;
    }
    resetPasswordWizard();
  };

  const finishPasswordReset = () => {
    if (mode === "password") {
      router.back();
      return;
    }
    resetPasswordWizard();
  };

  return (
    <div className="space-y-4">
      {mode === "profile" ? (
        <>
          <section className="overflow-hidden border-y border-slate-800 bg-slate-950/60 sm:rounded-lg sm:border">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-100">
                Login Account
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Name and mobile are linked to billing records. Email can be
                updated below.
              </p>
            </div>
            <div className="grid gap-0 divide-y divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
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
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-500/35 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Image
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={openImagePicker}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900"
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
                  <Label htmlFor="profile-email" className="text-slate-200">
                    Email
                  </Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                  <p className="text-xs text-slate-500">
                    Used only for email OTP and receipts when available.
                  </p>
                </div>
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
                Change your login password after WhatsApp or email OTP
                verification.
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
        isOpen={passwordWizardOpen}
        onClose={closePasswordModal}
        title="Update Password"
        size="lg"
      >
        <div className="space-y-5 overflow-hidden">
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
            {[
              {
                step: 1 as ResetStep,
                label: "Verification Method",
                done: otpSent,
              },
              { step: 2 as ResetStep, label: "Verify OTP", done: otpVerified },
              {
                step: 3 as ResetStep,
                label: "New Password",
                done: resetComplete,
              },
            ].map((item) => {
              const active = currentStep === item.step && !resetComplete;
              const disabled =
                (item.step === 2 && !otpSent) ||
                (item.step === 3 && !otpVerified);
              return (
                <button
                  key={item.step}
                  type="button"
                  disabled={disabled || resetComplete}
                  onClick={() => setCurrentStep(item.step)}
                  className={`flex min-h-14 min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition sm:px-3 ${
                    active
                      ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/40"
                      : item.done
                        ? "bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-400/20"
                        : "bg-slate-900 text-slate-400"
                  } disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      item.done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-blue-500 text-white"
                          : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.done ? <Check className="h-3.5 w-3.5" /> : item.step}
                  </span>
                  <span className="min-w-0 text-[11px] font-semibold leading-4 sm:text-xs">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {wizardError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {wizardError}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {resetComplete ? (
              <motion.div
                key="reset-complete"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-center"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Password Updated Successfully
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Your password has been changed successfully.
                  </p>
                </div>
                <Button
                  onClick={finishPasswordReset}
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-500 sm:w-auto"
                >
                  Done
                </Button>
              </motion.div>
            ) : currentStep === 1 ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Verify Your Identity
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Select where you want to receive the verification code.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!phoneValue}
                    onClick={() => setOtpChannel("whatsapp")}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
                      otpChannel === "whatsapp"
                        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current">
                      {otpChannel === "whatsapp" ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-current" />
                      ) : null}
                    </span>
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        WhatsApp
                      </span>
                      <span className="block truncate text-xs opacity-75">
                        {maskPhone(phoneValue)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!emailValue}
                    onClick={() => setOtpChannel("email")}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
                      otpChannel === "email"
                        ? "border-blue-400/60 bg-blue-500/15 text-blue-100"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current">
                      {otpChannel === "email" ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-current" />
                      ) : null}
                    </span>
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Email</span>
                      <span className="block truncate text-xs opacity-75">
                        {maskEmail(emailValue)}
                      </span>
                    </span>
                  </button>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={!otpSent}
                    className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    Continue
                  </Button>
                  <Button
                    onClick={requestOtp}
                    loading={otpRequestBusy}
                    disabled={otpVerifyBusy || passwordUpdateBusy}
                    className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                  >
                    {otpChannel === "whatsapp" ? (
                      <MessageCircle className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Send OTP
                  </Button>
                </div>
              </motion.div>
            ) : currentStep === 2 ? (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Enter Verification Code
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Enter the 6-digit OTP sent to your selected method.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                  <div className="font-semibold text-slate-100">
                    Verification code sent successfully.
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {otpChannel === "whatsapp" ? "WhatsApp" : "Email"}:{" "}
                    {selectedDestination}
                  </div>
                </div>

                {devOtp ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    Dev OTP: {devOtp}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="profile-otp" className="text-slate-200">
                    OTP
                  </Label>
                  <Input
                    id="profile-otp"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="6-digit code"
                    className="h-12 border-slate-700 bg-slate-900 text-lg tracking-[0.2em] text-white"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    disabled={otpVerifyBusy}
                    className="gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="ghost"
                      onClick={requestOtp}
                      disabled={resendSeconds > 0 || otpVerifyBusy}
                      loading={otpRequestBusy}
                      className="text-slate-200 hover:bg-slate-800"
                    >
                      {resendSeconds > 0
                        ? `Resend OTP (${resendSeconds}s)`
                        : "Resend OTP"}
                    </Button>
                    <Button
                      onClick={verifyOtp}
                      loading={otpVerifyBusy}
                      disabled={otpRequestBusy || passwordUpdateBusy}
                      className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Verify OTP
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Create New Password
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Choose a strong password for your account.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-slate-200">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Minimum 6 characters"
                        className="h-12 border-slate-700 bg-slate-900 pr-11 text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowNewPassword((current) => !current)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label={
                          showNewPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-slate-200"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Repeat new password"
                        className="h-12 border-slate-700 bg-slate-900 pr-11 text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">
                      Password strength
                    </span>
                    <span
                      className={
                        strength >= 3 ? "text-emerald-300" : "text-amber-300"
                      }
                    >
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((item) => (
                      <span
                        key={item}
                        className={`h-1.5 rounded-full ${
                          strength >= item
                            ? strength >= 3
                              ? "bg-emerald-400"
                              : "bg-amber-400"
                            : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={passwordUpdateBusy}
                    className="gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={updatePassword}
                    disabled={!otpVerified || otpRequestBusy || otpVerifyBusy}
                    loading={passwordUpdateBusy}
                    className="gap-2 bg-red-600 text-white hover:bg-red-500"
                  >
                    <KeyRound className="h-4 w-4" />
                    Update Password
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
