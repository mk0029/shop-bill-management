"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowLeft, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function AdminProfileSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving] = useState(false);

  const onChange = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // TODO: Wire this to actual profile update endpoint
      await new Promise((r) => setTimeout(r, 600));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-md:space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Profile</h1>
          <p className="text-gray-400 mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 max-md:space-y-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" /> Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-300">Full Name</Label>
              <Input
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="admin@shop.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
