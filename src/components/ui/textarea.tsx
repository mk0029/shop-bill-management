import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <textarea
          className={cn(
            "flex min-h-12 md:min-h-20 w-full rounded-md border !border-white/10 !bg-white/[0.055] px-3 py-2 text-sm text-slate-100 shadow-inner shadow-white/[0.03] outline-none ring-offset-transparent backdrop-blur-xl placeholder:text-slate-400/80 focus:!border-cyan-200/35 focus-visible:ring-2 focus-visible:ring-cyan-300/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base",
            error && "border-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
