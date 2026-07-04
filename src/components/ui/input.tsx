"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <motion.div
        initial={{ opacity: 0.1, filter: "blur(1px)" }} // starting state
        whileInView={{ opacity: 1, filter: "blur(0px)" }} // when it enters viewport
        transition={{ duration: 0.3, ease: "linear" }}
        viewport={{ once: false, amount: 0.5 }} // 👈 viewport settings
        className="relative z-0"
      >
        <div className="space-y-1">
          <input
            type={type}
            className={cn(
              "!text-base flex w-full rounded-md border !border-white/10 !bg-white/[0.055] px-2 sm:px-3 py-1.5 sm:py-2 text-slate-100 shadow-inner shadow-white/[0.03] outline-none ring-offset-transparent backdrop-blur-xl file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400/80 focus:!border-cyan-200/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
              error && "border-destructive",
              className,
            )}
            ref={ref}
            {...props}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </motion.div>
    );
  },
);
Input.displayName = "Input";

export { Input };
