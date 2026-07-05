"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tag, Loader2, Gift, CheckCircle, XCircle, Clock } from "lucide-react";
import type { OfferClaim } from "@/types/offers";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
  }
> = {
  claimed: { icon: Gift, color: "text-emerald-400", label: "Claimed" },
  used: { icon: CheckCircle, color: "text-blue-400", label: "Used" },
  expired: { icon: Clock, color: "text-gray-400", label: "Expired" },
  cancelled: { icon: XCircle, color: "text-red-400", label: "Cancelled" },
};

export function CustomerClaimsClient() {
  const [claims, setClaims] = useState<OfferClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers/me/offers/claims");
      const data = await res.json();
      if (data.success) setClaims(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  return (
    <div className="space-y-6 p-4 sm:p-6 h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">My Claims</h1>
        <p className="mt-1 text-sm text-gray-400">
          Track all your claimed offers
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-20">
          <Tag className="mb-3 h-10 w-10 text-gray-500" />
          <p className="text-sm text-gray-400">No claims yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Browse offers and claim your first deal
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim, i) => {
            const config = STATUS_CONFIG[claim.status] || STATUS_CONFIG.expired;
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={claim._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {claim.offerTitle || "Offer"}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.color} border-current/20 bg-current/5`}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {config.label}
                      </span>
                    </div>
                    {claim.productNames && claim.productNames.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">
                        Products: {claim.productNames.join(", ")}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                      <span>Claimed: {formatDate(claim.claimedAt)}</span>
                      {claim.offerType && <span>Type: {claim.offerType}</span>}
                      {claim.discountValue != null &&
                        claim.discountValue > 0 && (
                          <span>
                            Value:{" "}
                            {claim.offerType === "percentage"
                              ? `${claim.discountValue}%`
                              : `₹${claim.discountValue}`}
                          </span>
                        )}
                    </div>
                    {claim.cancelReason && (
                      <p className="mt-1 text-[11px] text-red-400/70">
                        Reason: {claim.cancelReason}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
