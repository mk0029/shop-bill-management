"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { quickLinks } from "@landing/lib/site-data";

export default function Header() {
  const [open, setOpen] = useState(false);
  const prevOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;

    if (open) {
      prevOverflowRef.current = body.style.overflow;
      body.style.overflow = "hidden";
      body.style.touchAction = "none";
      html.style.overflow = "hidden";
    } else {
      body.style.overflow = prevOverflowRef.current ?? "";
      body.style.touchAction = prevBodyTouchAction ?? "";
      html.style.overflow = prevHtmlOverflow ?? "";
    }
    return () => {
      body.style.overflow = prevBodyOverflow ?? "";
      html.style.overflow = prevHtmlOverflow ?? "";
      body.style.touchAction = prevBodyTouchAction ?? "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-sky-900/50 bg-slate-950/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/je-p-48.png" alt="Jambh Electrics logo" width={48} height={48} />
          <span className="hidden text-base font-semibold leading-none text-slate-100 sm:block">Jambh Electrics</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-base font-medium leading-none text-slate-200 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link href="/login">
            <Button size="lg" className="h-11 px-6 text-base font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400">Login</Button>
          </Link>
        </div>

        <button className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-700 text-slate-100 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/65 md:hidden"
              aria-label="Close menu overlay"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed right-0 top-0 z-[80] h-[100dvh] w-full border-l border-slate-700 bg-slate-950 p-5 shadow-2xl md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-100">Menu</span>
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 p-1 text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-base text-slate-200 hover:bg-slate-800"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/login" onClick={() => setOpen(false)} className="mt-2">
                  <Button className="h-11 w-full text-base font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400">
                    Login
                  </Button>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
