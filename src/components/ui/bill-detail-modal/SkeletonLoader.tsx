"use client";

import { motion } from "framer-motion";

export function BillSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="glass-card-static p-6"
        >
          <div className="animate-shimmer h-4 w-1/3 rounded-full mb-4" />
          <div className="space-y-3">
            <div className="animate-shimmer h-3 w-full rounded-full" />
            <div className="animate-shimmer h-3 w-5/6 rounded-full" />
            <div className="animate-shimmer h-3 w-2/3 rounded-full" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-full bg-white/5 ${className}`} />;
}
