/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dropdown } from "@/components/ui/dropdown";
import {
  SuccessPopup,
  createCustomerSuccessPopup,
} from "@/components/ui/success-popup";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  User,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Copy,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { locationOptions } from "../../app/admin/tools/fitting-items/constants";

const locationOptionsWithCustom = [
  ...locationOptions,
  { value: "__custom__", label: "Other (custom)" },
];

const SAMPLE_TEXT = `Customer Account Request
Name: Dummey User
Phone: 0987654321
Email: test@gmail.com
Location: ....
Contact Preference: whatsapp
Requirement: avxv`;

interface ParsedFields {
  name: string;
  phone: string;
  email: string;
  location: string;
  contactPreference: string;
  requirement: string;
}

interface FieldConfidence {
  name: boolean;
  phone: boolean;
  email: boolean;
  location: boolean;
  contactPreference: boolean;
  requirement: boolean;
}

function FieldStatus({
  detected,
  required,
  label,
  value,
}: {
  detected: boolean;
  required?: boolean;
  label: string;
  value: string;
}) {
  if (detected) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-white/70">{label}:</span>
        <span className="text-white font-medium truncate">{value || "—"}</span>
      </div>
    );
  }
  if (required) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span className="text-white/70">{label}:</span>
        <span className="text-rose-400 font-medium">Missing (required)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-400/70 shrink-0" />
      <span className="text-white/70">{label}:</span>
      <span className="text-amber-400/70 font-medium">Not provided</span>
    </div>
  );
}

export default function SmartCustomerCreatorClient() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user) as { id?: string; _id?: string } | null;
  const [rawText, setRawText] = useState("");
  const [parsedFields, setParsedFields] = useState<ParsedFields | null>(null);
  const [confidence, setConfidence] = useState<FieldConfidence | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [customLocation, setCustomLocation] = useState("");

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) {
      toast.error("Please paste some customer request text first");
      return;
    }
    setIsParsing(true);
    try {
      const res = await fetch("/api/admin/customers/smart-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, mode: "parse" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || "Failed to parse text");
        return;
      }
      const result = json.data;
      setParsedFields(result.parsedFields);
      setConfidence(result.confidence);
      if (result.missingRequired?.length > 0) {
        toast.warning(
          `Missing required fields: ${result.missingRequired.join(", ")}`,
        );
      } else {
        toast.success("Customer details parsed successfully");
      }
    } catch {
      toast.error("Failed to parse text");
    } finally {
      setIsParsing(false);
    }
  }, [rawText]);

  const handleCreate = useCallback(async () => {
    if (!parsedFields) {
      toast.error("Please parse the text first");
      return;
    }
    if (!parsedFields.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!parsedFields.phone.trim()) {
      toast.error("Phone is required");
      return;
    }

    const actorUserId = authUser?.id || authUser?._id;
    if (!actorUserId) {
      toast.error("You are not logged in");
      return;
    }

    setIsCreating(true);
    try {
      const resolvedLocation =
        parsedFields.location === "__custom__"
          ? customLocation
          : parsedFields.location;

      const res = await fetch("/api/admin/customers/smart-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create",
          actorUserId,
          name: parsedFields.name,
          phone: parsedFields.phone,
          email: parsedFields.email || undefined,
          location: resolvedLocation || undefined,
          requirement: parsedFields.requirement || undefined,
          contactPreference: parsedFields.contactPreference || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || "Failed to create customer");
        return;
      }

      setSuccessData(
        createCustomerSuccessPopup(json.data, () => {
          setParsedFields(null);
          setConfidence(null);
          setRawText("");
          setCustomLocation("");
        }),
      );
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  }, [parsedFields, customLocation]);

  const handleClear = () => {
    setRawText("");
    setParsedFields(null);
    setConfidence(null);
    setCustomLocation("");
  };

  const handleCreateAnother = () => {
    setParsedFields(null);
    setConfidence(null);
    setRawText("");
    setCustomLocation("");
  };

  const updateField = (field: keyof ParsedFields, value: string) => {
    if (!parsedFields) return;
    setParsedFields((prev) => (prev ? { ...prev, [field]: value } : null));
    if (confidence) {
      setConfidence((prev) =>
        prev ? { ...prev, [field]: !!value.trim() } : null,
      );
    }
  };

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              Smart Customer Creator
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Paste customer request text and create an account instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Section */}
        <Card className="bg-white/[0.055] border-white/[0.12] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Copy className="w-4 h-4 text-cyan-400" />
              Paste Customer Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300 text-sm">
                  Raw Request Text
                </Label>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_TEXT)}
                  className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                >
                  Load sample
                </button>
              </div>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Paste the customer request text here...\n\nExample:\nCustomer Account Request\nName: John Doe\nPhone: 9306712126\nEmail: john@example.com\nLocation: lilas\nContact Preference: whatsapp\nRequirement: Wiring work`}
                className="min-h-[200px] sm:min-h-[280px] bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleParse}
                disabled={isParsing || !rawText.trim()}
                loading={isParsing}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Parse Details
              </Button>
              <Button
                variant="ghost"
                onClick={handleClear}
                disabled={isParsing || isCreating}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Parsed Preview & Edit Section */}
        <Card className="bg-white/[0.055] border-white/[0.12] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <User className="w-4 h-4 text-cyan-400" />
              Parsed Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {!parsedFields ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">
                    Paste customer text and click &quot;Parse Details&quot; to
                    auto-fill
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="parsed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Confidence Indicators */}
                  {confidence && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                      <p className="text-xs text-white/50 font-medium mb-2">
                        Detection Status
                      </p>
                      <FieldStatus
                        detected={confidence.name}
                        required
                        label="Name"
                        value={parsedFields.name}
                      />
                      <FieldStatus
                        detected={confidence.phone}
                        required
                        label="Phone"
                        value={parsedFields.phone}
                      />
                      <FieldStatus
                        detected={confidence.email}
                        label="Email"
                        value={parsedFields.email}
                      />
                      <FieldStatus
                        detected={confidence.location}
                        label="Location"
                        value={parsedFields.location}
                      />
                      <FieldStatus
                        detected={confidence.contactPreference}
                        label="Contact Pref"
                        value={parsedFields.contactPreference}
                      />
                      <FieldStatus
                        detected={confidence.requirement}
                        label="Requirement"
                        value={parsedFields.requirement}
                      />
                    </div>
                  )}

                  {/* Editable Fields */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Name *
                      </Label>
                      <Input
                        value={parsedFields.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30"
                        placeholder="Customer name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        Phone *
                      </Label>
                      <Input
                        value={parsedFields.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30"
                        placeholder="Phone number"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </Label>
                      <Input
                        value={parsedFields.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30"
                        placeholder="Email address (optional)"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Location
                      </Label>
                      <Dropdown
                        options={locationOptionsWithCustom}
                        value={parsedFields.location}
                        onValueChange={(v) => updateField("location", v)}
                        placeholder="Select location"
                        className="bg-white/[0.04] border-white/[0.08]"
                      />
                      {parsedFields.location === "__custom__" && (
                        <Input
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30"
                          placeholder="Enter custom location"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-gray-300 text-xs flex items-center gap-1.5">
                          <PhoneCall className="w-3.5 h-3.5" />
                          Contact Pref
                        </Label>
                        <Input
                          value={parsedFields.contactPreference}
                          onChange={(e) =>
                            updateField("contactPreference", e.target.value)
                          }
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30"
                          placeholder="e.g. whatsapp"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-gray-300 text-xs flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Requirement
                        </Label>
                        <Input
                          value={parsedFields.requirement}
                          onChange={(e) =>
                            updateField("requirement", e.target.value)
                          }
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30"
                          placeholder="Optional requirement"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleCreate}
                      disabled={
                        isCreating ||
                        !parsedFields.name.trim() ||
                        !parsedFields.phone.trim()
                      }
                      loading={isCreating}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Create Customer
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCreateAnother}
                      disabled={isCreating}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Success Popup */}
      {successData && (
        <SuccessPopup
          isOpen={!!successData}
          onClose={() => setSuccessData(null)}
          data={successData}
        />
      )}
    </div>
  );
}
