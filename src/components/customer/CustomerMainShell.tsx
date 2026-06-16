"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useDynamicViewportHeight } from "@/hooks/use-dynamic-viewport-height";

export default function CustomerMainShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useDynamicViewportHeight({ shellClassName: "customer-shell" });

  const pathname = usePathname() || "";
  const isChatRoute = pathname === "/customer/chat";

  return (
    <main
      className={`max-md:px-3 max-sm:px-1 lg:ml-64 ${
        isChatRoute
          ? "h-[var(--app-vh,100dvh)] overflow-hidden p-0"
          : "h-[calc(var(--app-vh,100dvh)-var(--customer-topbar-h,57px))] overflow-y-auto overscroll-contain pt-3"
      }`}
    >
      <div className={isChatRoute ? "h-full" : "py-1 sm:p-2"}>{children}</div>
    </main>
  );
}
