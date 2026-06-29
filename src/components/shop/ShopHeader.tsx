"use client";

import Link from "next/link";
import { ShoppingCart, ArrowLeft, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/shop-queries";

export function ShopHeader({
  title,
  showBack,
  backHref,
}: {
  title: string;
  showBack?: boolean;
  backHref?: string;
}) {
  const { items, openCart, getTotalAmount } = useCartStore();
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const total = getTotalAmount();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-slate-950/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link
              href={backHref || "/shop-items"}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/50 transition-all hover:border-white/20 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div>
            <h1 className="text-base font-semibold text-white">{title}</h1>
            {showBack && (
              <Link
                href="/shop-items"
                className="text-[11px] text-sky-400/60 transition-colors hover:text-sky-400"
              >
                All Categories
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/shop-items"
            className="hidden items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white sm:flex"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Shop
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
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
        </div>
      </div>
    </header>
  );
}
