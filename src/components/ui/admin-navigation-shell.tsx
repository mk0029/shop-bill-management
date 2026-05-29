"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/ui/navigation";

export default function AdminNavigationShell() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <Navigation />;
}
