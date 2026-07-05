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
  const isPurchaseRoute = pathname === "/customer/purchase";

  return (
    <main
      className={`relative z-10 bg-transparent backdrop-blur-[1.5px] max-md:px-0 max-sm:px-0 lg:ml-64 ${
        isChatRoute
          ? "h-[var(--app-vh,100dvh)] overflow-hidden p-0"
          : isPurchaseRoute
            ? "h-[calc(var(--app-vh,100dvh)-var(--customer-topbar-h,57px))] overflow-hidden p-0"
            : "h-[calc(var(--app-vh,100dvh)-var(--customer-topbar-h,57px))] overflow-y-auto overflow-x-hidden touch-pan-y pt-3 max-md:px-3 max-sm:px-3"
      }`}
    >
      <div className={isChatRoute || isPurchaseRoute ? "h-full" : "h-full py-1 sm:p-2"}>{children}</div>
    </main>
  );
}
