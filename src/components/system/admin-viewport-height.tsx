"use client";

import { useDynamicViewportHeight } from "@/hooks/use-dynamic-viewport-height";

export default function AdminViewportHeight() {
  useDynamicViewportHeight({ shellClassName: "admin-shell" });
  return null;
}
