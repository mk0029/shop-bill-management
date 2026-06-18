"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type ShopChatRouteFrameProps = {
  children: React.ReactNode;
  mode: "admin" | "customer";
};

const MOBILE_HEADER_HEIGHT = "62px";

export default function ShopChatRouteFrame({
  children,
  mode,
}: ShopChatRouteFrameProps) {
  const [mounted, setMounted] = useState(false);
  const [roomOpen, setRoomOpen] = useState(mode === "customer");
  const [hasDesktopSidebar, setHasDesktopSidebar] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = mode === "admin" ? "(min-width: 1280px)" : "(min-width: 1024px)";
    const media = window.matchMedia(query);
    const sync = () => setHasDesktopSidebar(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [mode]);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: string; roomOpen?: boolean }>).detail;
      if (detail?.mode !== mode) return;
      setRoomOpen(Boolean(detail.roomOpen));
    };

    window.addEventListener("shop-chat:room-state", onState as EventListener);
    return () => window.removeEventListener("shop-chat:room-state", onState as EventListener);
  }, [mode]);

  const showMobileHeaderSpace = mode === "admin" && !hasDesktopSidebar && !roomOpen;
  const top = showMobileHeaderSpace ? MOBILE_HEADER_HEIGHT : "0px";
  const left = hasDesktopSidebar
    ? mode === "admin"
      ? "var(--admin-nav-w, 16rem)"
      : "16rem"
    : "0px";

  const frame = (
    <div
      className="fixed right-0 z-[30] overflow-hidden bg-[linear-gradient(135deg,#020617_0%,#08111f_34%,#061b17_66%,#160a18_100%)]"
      style={{
        top,
        left,
        height: showMobileHeaderSpace
          ? `calc(var(--app-vh, 100dvh) - ${MOBILE_HEADER_HEIGHT})`
          : "var(--app-vh, 100dvh)",
      }}
    >
      {children}
    </div>
  );

  if (!mounted) return null;

  return createPortal(frame, document.body);
}
