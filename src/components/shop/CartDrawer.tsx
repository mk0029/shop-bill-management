"use client";

import { useState } from "react";
import { useBackClose } from "@/hooks/useBackClose";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  MessageCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCartStore, type CartItem } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { formatPrice, getSanityImageUrl } from "@/lib/shop-queries";

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  compact,
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40, height: 0 }}
        className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-2 transition-colors hover:bg-white/[0.05]"
      >
        {item.imageUrl && (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-900">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white">{item.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-sky-400">
              {formatPrice(item.price)}
            </span>
            {item.originalPrice && item.originalPrice > item.price && (
              <span className="text-[9px] text-white/20 line-through">
                {formatPrice(item.originalPrice)}
              </span>
            )}
          </div>
          {item.offerAdjustedPrice != null && item.offerAdjustedPrice < item.price && (
            <div className="mt-0.5">
              <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-400/20 bg-amber-500/10 px-1 py-0.5 text-[8px] font-bold text-amber-400">
                <Sparkles className="h-2 w-2" />
                {item.offerType === "percentage" && item.offerDiscountValue != null
                  ? `${item.offerDiscountValue}% OFF`
                  : item.offerType === "fixed_amount" && item.offerDiscountValue != null
                    ? `₹${item.offerDiscountValue} OFF`
                    : item.offerTitle || "Offer"}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
            className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-white/50 transition-colors hover:border-white/20 hover:text-white"
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-white/[0.05] px-1 text-xs font-medium text-white">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
            className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-white/50 transition-colors hover:border-white/20 hover:text-white"
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-red-400/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </motion.div>
    );
  }

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
        </div>
        {item.offerAdjustedPrice != null && item.offerAdjustedPrice < item.price && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-400/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
              <Sparkles className="h-2.5 w-2.5" />
              {item.offerType === "percentage" && item.offerDiscountValue != null
                ? `${item.offerDiscountValue}% OFF`
                : item.offerType === "fixed_amount" && item.offerDiscountValue != null
                  ? `₹${item.offerDiscountValue} OFF`
                  : item.offerTitle || "Offer"}
            </span>
          </div>
        )}
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

export function CartDrawer({
  onPurchaseMore,
}: {
  onPurchaseMore?: () => void;
}) {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    updateItem,
    removeItem,
    clearCart,
  } = useCartStore();
  const [isClaiming, setIsClaiming] = useState(false);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const offerSavings = items.reduce((sum, item) => {
    if (item.offerAdjustedPrice != null && item.offerAdjustedPrice < item.price) {
      return sum + (item.price - item.offerAdjustedPrice) * item.quantity;
    }
    return sum;
  }, 0);
  const total = subtotal - offerSavings;

  useBackClose({
    isOpen,
    onClose: closeCart,
    id: "shop-cart-drawer",
  });

  const handleWhatsApp = async () => {
    // Claim unclaimed offers before generating the message
    const unclaimed = items.filter((i) => i.offerId && !i.offerClaimId);
    const uniqueOfferIds = [...new Set(unclaimed.map((i) => i.offerId))];

    if (uniqueOfferIds.length > 0) {
      setIsClaiming(true);
      const results = await Promise.allSettled(
        uniqueOfferIds.map((offerId) =>
          fetch(`/api/offers/${offerId}/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }).then((r) => r.json()),
        ),
      );
      results.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value.success) {
          const claim = result.value.data;
          const offerId = uniqueOfferIds[idx];
          items
            .filter((i) => i.offerId === offerId && !i.offerClaimId)
            .forEach((i) => {
              updateItem(i.productId, {
                offerClaimId: claim._id,
                offerCode: claim._id,
              });
            });
        }
      });
      setIsClaiming(false);
    }

    // Read updated items after claims
    const currentItems = useCartStore.getState().items;

    const supportWhatsApp =
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "+917015493276";
    const phone = supportWhatsApp.replace(/\D/g, "");

    let message = "🛒 *New Order Enquiry*\n\n--- *Items Ordered* ---\n";
    currentItems.forEach((item, index) => {
      message += `${index + 1}. ${item.name}`;
      if (item.brand) message += ` (${item.brand})`;
      message += `\n   Qty: ${item.quantity} × ${formatPrice(item.price)}`;
      message += ` = ${formatPrice(item.price * item.quantity)}\n`;
      if (item.offerCode) {
        message += `   Offer: ${item.offerTitle || "Claimed offer"} | Code: ${item.offerCode}\n`;
      }
    });
    message += `\n━━━━━━━━━━━━━━━\n`;
    message += `📦 *Total Items:* ${currentItems.reduce((s, i) => s + i.quantity, 0)}\n`;
    message += `💰 *Total Estimated:* ${formatPrice(total)}\n`;
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
            <div className="flex items-center justify-between border-b border-white/[0.06] p-3 lg:p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-violet-500/10 lg:h-9 lg:w-9 lg:rounded-xl">
                  <ShoppingCart className="h-3.5 w-3.5 text-sky-400 lg:h-4 lg:w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white lg:text-base">
                    Cart
                  </h2>
                  <p className="text-[10px] text-white/40 lg:text-[11px] ">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  onPurchaseMore?.();
                }}
                className="flex h-7 items-center gap-1 rounded-lg border border-sky-400/20 px-2 text-[11px] font-medium text-sky-400 transition-colors hover:bg-sky-400/10 lg:hidden"
              >
                <ShoppingCart className="h-3 w-3" />
                Add More
              </button>
              <button
                type="button"
                onClick={closeCart}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-white/20 hover:text-white lg:h-8 lg:w-8"
              >
                <X className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
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
                <div className="space-y-1.5 lg:space-y-2">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <CartItemRow
                        key={item.productId}
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeItem}
                        compact
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-white/[0.06] bg-white/[0.02] p-3">
                {/* Pricing summary */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/60">Subtotal</span>
                    <span className="text-[11px] text-white/80">{formatPrice(subtotal)}</span>
                  </div>
                  {offerSavings > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-amber-400">
                        <Sparkles className="h-2.5 w-2.5" />
                        Offer discount
                      </span>
                      <span className="text-[11px] text-amber-400">-{formatPrice(offerSavings)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/[0.06] my-1.5" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <span className="text-base font-bold text-sky-400">{formatPrice(total)}</span>
                  </div>
                </div>
                <p className="mt-1 text-[9px] text-amber-200/40">
                  Final amount confirmed at pickup
                </p>

                {/* Buttons row: Purchase More | WhatsApp */}
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      closeCart();
                      onPurchaseMore?.();
                    }}
                    className="flex-1 border-sky-400/20 text-[11px] text-sky-400 hover:bg-sky-400/10"
                  >
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    Add More
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleWhatsApp}
                    disabled={isClaiming}
                    className="flex-1 gap-1 bg-emerald-600 text-[11px] text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Claiming...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-3 w-3" /> Order
                      </>
                    )}
                  </Button>
                </div>

                {/* Clear All — highlighted at bottom */}
                <button
                  type="button"
                  onClick={clearCart}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-red-500/25 bg-red-500/8 py-2 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/15"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All Items
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
