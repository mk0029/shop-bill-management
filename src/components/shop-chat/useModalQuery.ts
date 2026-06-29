"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const MODAL_KEYS = ["modal", "mediaId", "mediaType"] as const;

export function useModalQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialCheckDone = useRef(false);

  const currentModal = searchParams.get("modal");
  const currentMediaId = searchParams.get("mediaId");
  const currentMediaType = searchParams.get("mediaType");

  // On mount: clear stale modal query (reload / direct link)
  useEffect(() => {
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;
    if (currentModal) {
      const params = new URLSearchParams(searchParams.toString());
      MODAL_KEYS.forEach((k) => params.delete(k));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openModal = useCallback(
    (type: string, mediaId?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("modal", type);
      if (mediaId) params.set("mediaId", mediaId);
      params.set("mediaType", type);
      const qs = params.toString();
      router.push(`${pathname}?${qs}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeModal = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    MODAL_KEYS.forEach((k) => params.delete(k));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return {
    currentModal,
    currentMediaId,
    currentMediaType,
    openModal,
    closeModal,
    hasModalQuery: currentModal !== null,
  };
}
