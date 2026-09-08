"use client";

import { useEffect } from "react";

export default function CustomerRequestCleanup() {
  useEffect(() => {
    fetch("/api/admin/customer-requests/cleanup").catch(() => {});
  }, []);
  return null;
}
