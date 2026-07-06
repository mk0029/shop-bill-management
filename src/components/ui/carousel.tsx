"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";

type ResponsiveCarouselProps = {
  children: React.ReactNode[];
  itemsPerView?: Partial<Record<Breakpoint, number>>;
  className?: string;
  showArrows?: boolean;
  showDots?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  gap?: number;
  infinite?: boolean;
};

const BREAKPOINTS: Record<Breakpoint, number> = {
  base: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

function resolveItemsPerView(
  config: Partial<Record<Breakpoint, number>>,
): number {
  const sorted = (Object.keys(BREAKPOINTS) as Breakpoint[])
    .filter((bp) => config[bp] !== undefined)
    .sort((a, b) => BREAKPOINTS[b] - BREAKPOINTS[a]);
  for (const bp of sorted) {
    if (window.innerWidth >= BREAKPOINTS[bp] && config[bp] !== undefined) {
      return config[bp]!;
    }
  }
  return config.base ?? 1;
}

export function ResponsiveCarousel({
  children,
  itemsPerView: itemsPerViewConfig = { base: 1, sm: 2, md: 3, lg: 4 },
  className,
  showArrows = true,
  showDots = true,
  autoPlay = false,
  autoPlayInterval = 4000,
  gap = 16,
  infinite = false,
}: ResponsiveCarouselProps) {
  const slides = Array.isArray(children) ? children : [children];
  const [itemsPerView, setItemsPerView] = useState(() => {
    if (typeof window === "undefined") return itemsPerViewConfig.lg ?? itemsPerViewConfig.md ?? itemsPerViewConfig.sm ?? itemsPerViewConfig.base ?? 1;
    return resolveItemsPerView(itemsPerViewConfig);
  });
  const maxIndex = Math.max(0, slides.length - itemsPerView);
  const [current, setCurrent] = useState(0);
  const safeCurrent = Math.min(current, maxIndex);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const canGoNext = infinite || safeCurrent < maxIndex;
  const canGoPrev = infinite || safeCurrent > 0;

  useEffect(() => {
    const onResize = () => {
      const ipv = resolveItemsPerView(itemsPerViewConfig);
      setItemsPerView(ipv);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [itemsPerViewConfig]);

  useEffect(() => {
    const newMax = Math.max(0, slides.length - itemsPerView);
    setCurrent((c) => Math.min(c, newMax));
  }, [itemsPerView, slides.length]);

  useEffect(() => {
    if (!autoPlay || slides.length <= itemsPerView) return;
    autoplayRef.current = setInterval(() => {
      setCurrent((c) => {
        const m = Math.max(0, slides.length - itemsPerView);
        return c >= m ? 0 : c + 1;
      });
    }, autoPlayInterval);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [autoPlay, autoPlayInterval, itemsPerView, slides.length]);

  const goNext = useCallback(() => {
    setCurrent((c) => {
      const m = Math.max(0, slides.length - itemsPerView);
      return c >= m ? (infinite ? 0 : c) : c + 1;
    });
  }, [infinite, itemsPerView, slides.length]);

  const goPrev = useCallback(() => {
    setCurrent((c) => {
      const m = Math.max(0, slides.length - itemsPerView);
      return c <= 0 ? (infinite ? m : c) : c - 1;
    });
  }, [infinite, itemsPerView, slides.length]);

  const goTo = useCallback(
    (index: number) => {
      const m = Math.max(0, slides.length - itemsPerView);
      setCurrent(Math.max(0, Math.min(index, m)));
    },
    [itemsPerView, slides.length],
  );

  if (slides.length === 0) return null;

  const slidePercent = 100 / itemsPerView;

  return (
    <div className={cn("relative select-none", className)}>
      <div className="overflow-hidden">
        <motion.div
          className="flex"
          animate={{ x: `${-(safeCurrent * slidePercent)}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {slides.map((child, idx) => (
            <div
              key={idx}
              className="shrink-0"
              style={{
                width: `calc(${slidePercent}% - ${gap * (itemsPerView - 1) / itemsPerView}px)`,
                marginRight: idx < slides.length - 1 ? gap : 0,
              }}
            >
              {child}
            </div>
          ))}
        </motion.div>
      </div>

      {showArrows && maxIndex > 0 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={goPrev}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10",
              "flex h-9 w-9 items-center justify-center rounded-full",
              "bg-white/10 backdrop-blur-xl border border-white/10",
              "text-white/70 hover:text-white hover:bg-white/20",
              "transition-all duration-200",
              "max-sm:hidden",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={goNext}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10",
              "flex h-9 w-9 items-center justify-center rounded-full",
              "bg-white/10 backdrop-blur-xl border border-white/10",
              "text-white/70 hover:text-white hover:bg-white/20",
              "transition-all duration-200",
              "max-sm:hidden",
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {showDots && maxIndex > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === safeCurrent
                  ? "w-6 bg-sky-400"
                  : "w-2 bg-white/20 hover:bg-white/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
