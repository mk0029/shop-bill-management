"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, MessageCircle, Phone, LayoutDashboard } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getSupportContact } from "@/lib/auth-service";
import { shareToWhatsAppApp } from "@/lib/whatsapp-app-share";
import { useAuthStore } from "@/store/auth-store";
import { getAuthenticatedHomeRoute } from "@/lib/auth-routes";
import Image from "next/image";

export default function Header() {
  const [open, setOpen] = useState(false);
  const prevOverflowRef = useRef<string | null>(null);
  const support = getSupportContact();
  const { isAuthenticated, role } = useAuthStore();
  const dashboardHref = getAuthenticatedHomeRoute(role);

  useEffect(() => {
    const body = document.body;
    if (open) {
      prevOverflowRef.current = body.style.overflow;
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = prevOverflowRef.current ?? "";
    }
    return () => {
      body.style.overflow = prevOverflowRef.current ?? "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between py-1">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="">
            {" "}
            <Image
              quality="100"
              src="/je-p-48.png"
              width={48}
              height={48}
              className="h-auto w-12 sm:w-12 "
              alt="Logo"
            />
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/#home"
            className="hover:text-foreground text-base text-muted-foreground"
          >
            Home
          </Link>
          <Link
            href="/#about"
            className="hover:text-foreground text-base text-muted-foreground"
          >
            About
          </Link>
          {!isAuthenticated && (
            <Link
              href="/#request"
              className="hover:text-foreground text-base text-muted-foreground"
            >
              Request Account
            </Link>
          )}
        </nav>

        <div className="hidden md:block">
          {isAuthenticated ? (
            <Link href={dashboardHref}>
              <Button size="sm">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded bg-gray-900 border border-gray-700 text-white"
          onClick={() => setOpen(true)}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-[100dvh] w-[85vw] max-w-sm bg-gray-900 border-l border-gray-800 z-[60] md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="sm:p-4 p-3 space-y-2 flex-1 overflow-auto flex flex-col grow">
                <Link
                  href="/#home"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-md text-base text-gray-300 hover:bg-gray-800"
                >
                  <span className="font-medium">Home</span>
                </Link>
                <Link
                  href="/#about"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-md text-base text-gray-300 hover:bg-gray-800"
                >
                  <span className="font-medium">About</span>
                </Link>
                {!isAuthenticated && (
                  <Link
                    href="/#request"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-md text-base text-gray-300 hover:bg-gray-800"
                  >
                    <span className="font-medium">Request Account</span>
                  </Link>
                )}

                <div className="pt-3" />

                <div className="flex gap-2">
                  {" "}
                  <Button
                    className="flex-1 justify-center"
                    onClick={() => {
                      const msg = "Hello! I need electrical service.";
                      shareToWhatsAppApp({
                        text: msg,
                        phone: support.whatsapp,
                      }).catch(() => {});
                      setOpen(false);
                    }}
                  >
                    <MessageCircle className="mr-2 h-5 w-5" /> Get Service
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 justify-center"
                    onClick={() => {
                      window.open(`tel:${support.phone}`, "_blank");
                      setOpen(false);
                    }}
                  >
                    <Phone className="mr-2 h-5 w-5" /> Call for Inspection
                  </Button>
                </div>
              </div>

              <div className="p-4 border-t border-gray-800">
                {isAuthenticated ? (
                  <Link href={dashboardHref} onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
