"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { modalStack } from "@/lib/modal-stack";

export function ModalStackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const [, setStackSize] = useState(0);

  useEffect(() => {
    modalStack.install();
    const unsubscribe = modalStack.subscribe((stack) => {
      setStackSize(stack.length);
    });

    return () => {
      unsubscribe();
      modalStack.uninstall();
    };
  }, []);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    modalStack.resetForRouteChange();
  }, [pathname]);

  return <>{children}</>;
}

