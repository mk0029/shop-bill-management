"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to bills page since that's the main customer functionality
    router.replace("/customer/bills");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
