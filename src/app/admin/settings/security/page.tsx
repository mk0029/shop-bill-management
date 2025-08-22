"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, KeyRound, Shield, UserX, Users, RefreshCcw } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // In this app, changing password will rotate the user's secret key
    if (!user) {
      setError("No user in session");
      return;
    }
    // Basic confirmation to avoid accidental rotations
    if (pwd.next !== pwd.confirm) {
      setError("New secret entries do not match");
      return;
    }
    setSaving(true);
    try {
      const targetId = (user as any)._id || (user as any).id;
      const res = await fetch(`/api/users/${encodeURIComponent(targetId)}/regenerate-secret`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      const secret = json.data?.secretKey as string;
      setNewSecretKey(secret);
      // Update local auth user with the new secret
      if (secret) {
        setUser({ ...user, secretKey: secret });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to regenerate secret key");
    } finally {
      setSaving(false);
    }
  };

  // Placeholder datasets for management sections
  const [inactiveUsers, setInactiveUsers] = useState([
    { id: "u1", name: "Staff One", email: "staff1@shop.com" },
  ]);
  const [inactiveBrands, setInactiveBrands] = useState([
    { id: "b1", name: "BrandX" },
  ]);
  const [deletedItems, setDeletedItems] = useState([
    { id: "p1", type: "Inventory", name: "Resistor Kit" },
  ]);

  const activateUser = (id: string) => setInactiveUsers((l) => l.filter((x) => x.id !== id));
  const activateBrand = (id: string) => setInactiveBrands((l) => l.filter((x) => x.id !== id));
  const restoreItem = (id: string) => setDeletedItems((l) => l.filter((x) => x.id !== id));

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void | Promise<void>) | null>(null);

  const openActivateUser = (u: { id: string; name: string; email?: string }) => {
    setConfirmTitle("Activate User");
    setConfirmMessage(`Do you want to activate ${u.name}${u.email ? ` (${u.email})` : ""}?`);
    setConfirmAction(() => () => activateUser(u.id));
    setConfirmOpen(true);
  };

  const openActivateBrand = (b: { id: string; name: string }) => {
    setConfirmTitle("Activate Brand");
    setConfirmMessage(`Do you want to activate brand ${b.name}?`);
    setConfirmAction(() => () => activateBrand(b.id));
    setConfirmOpen(true);
  };

  const openRestoreItem = (d: { id: string; name: string; type?: string }) => {
    setConfirmTitle("Restore Item");
    setConfirmMessage(`Restore "${d.name}"${d.type ? ` (${d.type})` : ""} from deleted?`);
    setConfirmAction(() => () => restoreItem(d.id));
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6 max-md:space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Security</h1>
          <p className="text-gray-400 mt-1">Password, authentication, and entity status management</p>
        </div>
      </div>

      {/* Change Password */}
      <form onSubmit={onChangePassword} className="space-y-6 max-md:space-y-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-300">Current Password</Label>
              <Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">New Secret</Label>
              <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Confirm Secret</Label>
              <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            {error && (
              <div className="md:col-span-3 text-sm text-red-400">{error}</div>
            )}
            {newSecretKey && (
              <div className="md:col-span-3 p-3 rounded-md bg-gray-800 border border-gray-700">
                <p className="text-gray-300 text-sm">New Secret Key (copy and store securely):</p>
                <p className="text-white font-mono break-all mt-1">{newSecretKey}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>Regenerate Secret Key</Button>
          <Button type="button" variant="outline" onClick={() => setPwd({ current: "", next: "", confirm: "" })} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Reset
          </Button>
        </div>
      </form>

      {/* Entity Status Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" /> Inactive Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inactiveUsers.length === 0 && (
              <p className="text-gray-400 text-sm">No inactive users</p>
            )}
            {inactiveUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                <div>
                  <p className="text-white font-medium">{u.name}</p>
                  <p className="text-gray-400 text-sm">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openActivateUser(u)}>Activate</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" /> Inactive Brands
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inactiveBrands.length === 0 && (
              <p className="text-gray-400 text-sm">No inactive brands</p>
            )}
            {inactiveBrands.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                <p className="text-white font-medium">{b.name}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openActivateBrand(b)}>Activate</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserX className="w-5 h-5" /> Marked as Deleted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deletedItems.length === 0 && (
              <p className="text-gray-400 text-sm">Nothing to restore</p>
            )}
            {deletedItems.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                <div>
                  <p className="text-white font-medium">{d.name}</p>
                  <p className="text-gray-400 text-xs">{d.type}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openRestoreItem(d)}>Restore</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await confirmAction?.();
          setConfirmOpen(false);
        }}
        title={confirmTitle}
        message={confirmMessage}
        type="confirm"
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
}
