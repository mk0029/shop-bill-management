"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  UserCheck,
  RefreshCw,
  CreditCard,
  Bell,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { GlassCard, GlassCardHeader } from "./GlassCard";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "./types";

interface ActivityTimelineProps {
  bill: any;
}

const activityIconMap: Record<string, any> = {
  created: FileText,
  assigned: UserCheck,
  updated: RefreshCw,
  payment: CreditCard,
  reminder: Bell,
  completed: CheckCircle2,
};

const activityColorMap: Record<string, string> = {
  created: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  assigned: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  updated: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  payment: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  reminder: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function extractActivities(bill: any): ActivityEntry[] {
  const activities: ActivityEntry[] = [];

  if (bill.createdAt) {
    activities.push({
      id: "created",
      action: "Bill Created",
      timestamp: bill.createdAt,
      user: bill.createdBy || "Admin",
      type: "created",
    });
  }

  if (bill.technician?.name && bill.technician?.assignedDate) {
    activities.push({
      id: "assigned",
      action: `Technician Assigned: ${bill.technician.name}`,
      timestamp: bill.technician.assignedDate,
      user: "System",
      type: "assigned",
    });
  }

  if (bill.updatedAt) {
    activities.push({
      id: "updated",
      action: "Bill Updated",
      timestamp: bill.updatedAt,
      user: bill.updatedBy || "Admin",
      type: "updated",
    });
  }

  if (bill.paymentDate) {
    activities.push({
      id: "payment",
      action: `Payment Received — ${bill.paymentStatus === "paid" ? "Full Payment" : "Partial Payment"}`,
      timestamp: bill.paymentDate,
      user: bill.paymentReceivedBy || "Customer",
      type: "payment",
    });
  }

  if (bill.paymentStatus === "paid" && !bill.paymentDate) {
    activities.push({
      id: "completed",
      action: "Bill Completed",
      timestamp: bill.updatedAt || bill.createdAt,
      user: "System",
      type: "completed",
    });
  }

  // Sort by timestamp ascending (oldest first)
  activities.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return activities;
}

function formatTime(d: string) {
  if (!d) return "";
  try {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export const ActivityTimeline = memo(function ActivityTimeline({
  bill,
}: ActivityTimelineProps) {
  const activities = useMemo(() => extractActivities(bill), [bill]);

  if (activities.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard>
        <GlassCardHeader title="Activity" />
        <div className=" px-3 sm:px-5 md:px-6 pb-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[17px] top-3 bottom-3 w-px bg-gradient-to-b from-white/[0.1] via-white/[0.06] to-transparent" />

            <div className="space-y-0">
              {activities.map((activity, i) => {
                const Icon =
                  activityIconMap[activity.type || "updated"] || RefreshCw;
                const colorClass =
                  activityColorMap[activity.type || "updated"] ||
                  activityColorMap.updated;
                const isLast = i === activities.length - 1;

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                    className="flex gap-4 pb-1 relative"
                  >
                    {/* Icon dot */}
                    <div
                      className={cn(
                        "relative z-10 mt-0.5 w-9 h-9 rounded-full border flex items-center justify-center shrink-0",
                        colorClass,
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <p className="text-sm font-medium text-white/80">
                        {activity.action}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-white/30">
                          {activity.user}
                        </span>
                        <span className="text-white/15">·</span>
                        <span className="text-xs text-white/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
});
