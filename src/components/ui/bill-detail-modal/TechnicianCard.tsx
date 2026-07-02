"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Phone, MessageSquare, User, Calendar } from "lucide-react";
import { safeUserName } from "@/lib/display-text";
import { GlassCard, GlassCardHeader } from "./GlassCard";

interface TechnicianCardProps {
  bill: any;
}

export const TechnicianCard = memo(function TechnicianCard({
  bill,
}: TechnicianCardProps) {
  const tech = bill.technician;
  const hasTech = tech?.name;

  if (!hasTech) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <GlassCard>
          <GlassCardHeader title="Technician" />
          <div className=" px-3 sm:px-5 md:px-6 pb-6">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                <User className="w-7 h-7 text-white/20" />
              </div>
              <p className="text-sm text-white/40">No technician assigned</p>
              <p className="text-xs text-white/20 mt-1">
                Assign a technician to this bill
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  const name = safeUserName(tech.name, "Technician");
  const phone = tech.phone || "";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-white/10 flex items-center justify-center shrink-0"
            >
              <span className="text-base font-bold text-white/80">
                {initials}
              </span>
            </motion.div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-white truncate">
                {name}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3 h-3 text-white/30" />
                <span className="text-xs text-white/40">
                  Assigned:{" "}
                  {tech.assignedDate
                    ? new Date(tech.assignedDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>
            {tech.status && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300/80 border border-emerald-500/20">
                {tech.status}
              </span>
            )}
          </div>

          {(phone || tech.email) && (
            <>
              <div className="glass-divider my-4" />
              <div className="flex flex-wrap gap-2">
                {phone && (
                  <>
                    <TechAction
                      icon={Phone}
                      href={`tel:${phone}`}
                      label="Call"
                    />
                    <TechAction
                      icon={MessageSquare}
                      href={`https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}`}
                      label="WhatsApp"
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
});

function TechAction({
  icon: Icon,
  href,
  label,
}: {
  icon: any;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}
