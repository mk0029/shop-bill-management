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
              
                initial={{ opacity:0.1,filter: 'blur(1px)' }} // starting state
                whileInView={{opacity:1,filter: 'blur(0px)' }} // when it enters viewport
                transition={{ duration: 0.3, ease: "linear" }} 
                viewport={{ once: false, amount: 0.5 }}  // 👈 viewport settings
              
  
                >
      <div className="space-y-1">
        <input
          type={type}
          className={cn(
            "flex w-full rounded-md border outline-none focus-visible:ring-0 focus:border-white border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation ",
            error && "border-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      </motion.div>
    );
  }
);
Input.displayName = "Input";

export { Input };
