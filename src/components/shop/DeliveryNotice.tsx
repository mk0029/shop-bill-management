"use client";

import { motion } from "framer-motion";
import { Info, MessageCircle } from "lucide-react";

export function DeliveryNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 backdrop-blur-sm"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
          <Info className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1 text-xs leading-relaxed text-amber-200/80">
          <p className="font-medium text-amber-200">Pickup Only</p>
          <p className="mt-0.5">
            We currently do not support home delivery. You can add items to cart
            and contact the shop directly to confirm availability and pickup.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
