"use client";

import { useEffect } from "react";

type Options = {
  shellClassName?: string;
};

export function useDynamicViewportHeight(options: Options = {}) {
  const { shellClassName = "chat-shell" } = options;

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    const vv = window.visualViewport;

    const setViewportVars = () => {
      const height = vv?.height || window.innerHeight;
      const keyboard = Math.max(0, window.innerHeight - height);

      root.style.setProperty("--app-vh", `${height}px`);
      root.style.setProperty("--kbd-offset", `${keyboard}px`);
      root.classList.toggle("kbd-open", keyboard > 120);
    };

    setViewportVars();
    root.classList.add(shellClassName);
    body.classList.add(shellClassName);

    vv?.addEventListener("resize", setViewportVars);
    vv?.addEventListener("scroll", setViewportVars);
    window.addEventListener("resize", setViewportVars);

    return () => {
      vv?.removeEventListener("resize", setViewportVars);
      vv?.removeEventListener("scroll", setViewportVars);
      window.removeEventListener("resize", setViewportVars);
      root.classList.remove(shellClassName, "kbd-open");
      body.classList.remove(shellClassName);
    };
  }, [shellClassName]);
}
