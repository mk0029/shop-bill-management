"use client";

import { useBackClose } from "@/hooks/useBackClose";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  MessageCircle,
  IndianRupee,
  Sparkles,
  Percent,
} from "lucide-react";
import { useCartStore, type CartItem } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatPrice,
  calculateDiscount,
  getSanityImageUrl,
} from "@/lib/shop-queries";

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const discount = calculateDiscount(item.originalPrice || 0, item.price);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, height: 0 }}
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]"
    >
      {item.imageUrl && (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-900">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{item.name}</p>
        {item.brand && (
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-sky-400/60">
            {item.brand}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-sky-400">
            {formatPrice(item.price)}
          </span>
          {item.originalPrice && item.originalPrice > item.price && (
            <span className="text-[11px] text-white/30 line-through">
              {formatPrice(item.originalPrice)}
            </span>
          )}
          {discount > 0 && (
            <span className="text-[10px] text-red-400">{discount}% off</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-white/[0.05] px-2 text-sm font-medium text-white">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.productId)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400/50 transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalAmount,
  } = useCartStore();
  const total = getTotalAmount();
  const totalSavings = items.reduce((sum, item) => {
    const orig = item.originalPrice || item.price;
    return sum + (orig - item.price) * item.quantity;
  }, 0);


  useBackClose({
    isOpen,
    onClose: closeCart,
    id: "shop-cart-drawer",
  });

  const handleWhatsApp = () => {
    const supportWhatsApp =
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "+917015493276";
    const phone = supportWhatsApp.replace(/\D/g, "");

    let message = "🛒 *New Order Enquiry*\n\n--- *Items Ordered* ---\n";
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name}`;
      if (item.brand) message += ` (${item.brand})`;
      message += `\n   Qty: ${item.quantity} × ${formatPrice(item.price)}`;
      message += ` = ${formatPrice(item.price * item.quantity)}\n`;
    });
    message += `\n━━━━━━━━━━━━━━━\n`;
    message += `📦 *Total Items:* ${items.reduce((s, i) => s + i.quantity, 0)}\n`;
    message += `💰 *Total Estimated:* ${formatPrice(total)}\n`;
    // if (totalSavings > 0) {
    //   message += `🏷️ *You Save:* ${formatPrice(totalSavings)}\n`;
    // }
    message += `\n━━━━━━━━━━━━━━━`;
    message += `\n📍 *Pickup Order*`;
    message += "\n\nPlease confirm availability and pickup timing. Thank you!";

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-md flex-col border-l border-white/[0.08] bg-slate-950 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/10">
                  <ShoppingCart className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Cart</h2>
                  <p className="text-[11px] text-white/40">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
                    <ShoppingCart className="h-8 w-8 text-white/10" />
                  </div>
                  <p className="text-sm font-medium text-white/40">
                    Your cart is empty
                  </p>
                  <p className="mt-1 text-xs text-white/20">
                    Browse items and add them to your cart
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <CartItemRow
                        key={item.productId}
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeItem}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-white/[0.06] bg-white/[0.02] p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Subtotal</span>
                    <span className="text-white/80">{formatPrice(total)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Percent className="h-3 w-3" />
                        Total Savings
                      </span>
                      <span className="text-emerald-400">
                        {formatPrice(totalSavings)}
                      </span>
                    </div>
                  )}
                  <div className="my-2 h-px bg-white/[0.06]" />
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-white">
                      Total Estimated
                    </span>
                    <span className="text-xl font-bold text-sky-400">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-amber-200/50">
                  Final amount confirmed by shop on pickup.
                </p>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCart}
                    className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={handleWhatsApp}
                    className="flex-1 gap-2 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Order via WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
