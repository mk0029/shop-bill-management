"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRegistrationRequestStore, initializeRegistrationListener } from "@/store/registration-request-store";
import { useAuthStore } from "@/store/auth-store";

export default function RegistrationRequestToast() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const isStaff = role === "admin" || role === "super_admin" || role === "technician";
  const lastEvent = useRegistrationRequestStore((s) => s.lastEvent);
  const pendingCount = useRegistrationRequestStore((s) => s.pendingCount);
  const initRef = useRef(false);

  useEffect(() => {
    if (!isStaff) return;
    if (initRef.current) return;
    initRef.current = true;
    initializeRegistrationListener();
  }, [isStaff]);

  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "registration:created") return;
    if (!pendingCount) return;
    toast.success(`${pendingCount} pending registration request${pendingCount > 1 ? "s" : ""}`, {
      description: "New customer registration request received",
      action: {
        label: "View",
        onClick: () => router.push("/admin/customers?modal=customerRequests"),
      },
      duration: 8000,
    });
  }, [lastEvent, pendingCount, router]);

  return null;
}
