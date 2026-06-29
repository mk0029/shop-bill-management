"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Menu,
  X,
  Home,
  Sparkles,
  Wrench,
  Phone,
  Store,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/cart-store";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/shop-queries";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Shop Items", href: "/shop-items", icon: Store },
  { label: "Services", href: "/services", icon: Wrench },
  { label: "Contact", href: "/contact", icon: Phone },
];

export function ShopNavbar() {
  const pathname = usePathname();
  const { items, openCart, getTotalAmount } = useCartStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prevOverflowRef = useRef<string | null>(null);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const total = getTotalAmount();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    if (mobileOpen) {
      prevOverflowRef.current = body.style.overflow;
      body.style.overflow = "hidden";
      body.style.touchAction = "none";
      html.style.overflow = "hidden";
    } else {
      body.style.overflow = prevOverflowRef.current ?? "";
      body.style.touchAction = "";
      html.style.overflow = "";
    }
    return () => {
      body.style.overflow = "";
      body.style.touchAction = "";
      html.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-slate-950/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/10"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-violet-500/10 ring-1 ring-white/5 transition-all duration-300 group-hover:from-sky-500/30 group-hover:to-violet-500/20">
              <Store className="h-4 w-4 text-sky-400" />
            </div>
            <span className="hidden text-sm font-bold text-white tracking-tight sm:block">
              Jambh Electrics
            </span>
          </Link>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-300",
                    active
                      ? "text-white bg-white/10"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]",
                  )}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.06]"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Cart + Mobile menu */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCart}
              className="relative flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <Badge className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-sky-500/30">
                  {totalItems > 99 ? "99+" : totalItems}
                </Badge>
              )}
              {totalItems > 0 && (
                <span className="hidden text-xs font-medium text-sky-400 sm:inline">
                  {formatPrice(total)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition-colors hover:border-white/20 hover:text-white lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 z-[80] w-full max-w-sm border-l border-white/[0.08] bg-slate-950 p-5 shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-semibold text-white">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        active
                          ? "bg-sky-400/10 text-sky-300 border border-sky-400/20"
                          : "text-slate-300 hover:bg-white/[0.06] border border-transparent",
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openCart();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <ShoppingCart className="h-4 w-4 text-sky-400" />
                  View Cart
                  {totalItems > 0 && (
                    <span className="ml-auto text-xs text-sky-400">
                      {totalItems} items · {formatPrice(total)}
                    </span>
                  )}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
