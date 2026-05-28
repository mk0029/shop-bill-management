"use client";

import { BillingBrowser } from "@/components/billing/billing-browser";

export default function AdminBillingClient({
  isTechnician = false,
}: {
  isTechnician?: boolean;
}) {
  return <BillingBrowser isTechnician={isTechnician} />;
}
