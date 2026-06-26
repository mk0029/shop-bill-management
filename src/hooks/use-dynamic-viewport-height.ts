"use client";

import { useEffect, useRef } from "react";

const KEYBOARD_THRESHOLD = 120;

type Options = {
  shellClassName?: string;
};

export function useDynamicViewportHeight(options: Options = {}) {
  const shellClassNameRef = useRef(options.shellClassName);
  const rafRef = useRef(0);
  const scrollYRef = useRef(0);

  useEffect(() => {
    const shellClassName = shellClassNameRef.current;

    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    const vv = window.visualViewport;

    const origOverflow = root.style.overflow;
    const origBodyOverflow = body.style.overflow;
    scrollYRef.current = window.scrollY;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    root.classList.add("chat-locked");
    body.classList.add("chat-locked");
    if (shellClassName) {
      root.classList.add(shellClassName);
      body.classList.add(shellClassName);
    }

    if (!vv) {
      root.style.setProperty("--app-vh", `${window.innerHeight}px`);
      root.style.setProperty("--kbd-offset", "0px");
      return () => {
        root.style.removeProperty("--app-vh");
        root.style.removeProperty("--kbd-offset");
        root.classList.remove("chat-locked");
        body.classList.remove("chat-locked");
        if (shellClassName) {
          root.classList.remove(shellClassName);
          body.classList.remove(shellClassName);
        }
        root.style.overflow = origOverflow;
        body.style.overflow = origBodyOverflow;
        body.style.touchAction = "";
      };
    }

    const setVars = () => {
      const vh = vv.height;
      const layoutHeight = window.innerHeight;
      const keyboard = Math.max(0, layoutHeight - vh);
      const isOpen = keyboard > KEYBOARD_THRESHOLD;

      root.style.setProperty("--app-vh", `${vh}px`);
      root.style.setProperty("--app-viewport-height", `${vh}px`);
      root.style.setProperty("--kbd-offset", `${keyboard}px`);

      root.classList.toggle("kbd-open", isOpen);
      body.classList.toggle("kbd-open", isOpen);

      if (isOpen && window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const onViewportChange = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(setVars);
    };

    setVars();

    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);

    return () => {
      cancelAnimationFrame(rafRef.current);

      vv.removeEventListener("resize", onViewportChange);
      vv.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);

      root.classList.remove("chat-locked", "kbd-open");
      body.classList.remove("chat-locked", "kbd-open");
      root.style.removeProperty("--app-vh");
      root.style.removeProperty("--app-viewport-height");
      root.style.removeProperty("--kbd-offset");

      if (shellClassName) {
        root.classList.remove(shellClassName);
        body.classList.remove(shellClassName);
      }

      root.style.overflow = origOverflow;
      body.style.overflow = origBodyOverflow;
      body.style.touchAction = "";

      if (scrollYRef.current > 0) {
        window.scrollTo(0, scrollYRef.current);
      }
    };
  }, []);
}
