"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WhatsAppSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to enhanced WhatsApp settings
    router.replace("/admin/settings/whatsapp-enhanced");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-white">
        Redirecting to enhanced WhatsApp settings...
      </div>
    </div>
  );
}
