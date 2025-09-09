"use client";
import OnlineStatusAdmin from "@/components/online/OnlineStatusAdmin";

export default function OnlineSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Store Online Status</h1>
      <OnlineStatusAdmin />
    </div>
  );
}
