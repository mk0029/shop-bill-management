"use client";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerProfileRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/customer/settings");
  }, [router]);

  return null;
}