"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, CalendarDays, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type PickerMode = "date" | "time" | "datetime";

interface AppDateTimePickerProps {
  mode?: PickerMode;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disablePastDates?: boolean;
  disablePastTime?: boolean;
  minTime?: string;
  maxTime?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const PANEL_WIDTH = 340;
const PANEL_GAP = 6;
const ESTIMATED_PANEL_HEIGHT = 420;
const HORIZONTAL_MARGIN = 12;

function toDate(value?: string): Date {
  const d = value ? new Date(value) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeStr(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatEnIN(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatEnINWithTime(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AppDateTimePicker({
  mode = "datetime",
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  minDate,
  maxDate,
  disablePastDates = false,
  disablePastTime = false,
  minTime,
  maxTime,
}: AppDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"calendar" | "time">(mode === "time" ? "time" : "calendar");
  const [navYear, setNavYear] = useState<number | null>(null);
  const [navMonth, setNavMonth] = useState<number | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoursListRef = useRef<HTMLDivElement>(null);
  const minutesListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const initialDate = toDate(value);
    setTempDate(initialDate);
    setNavYear(initialDate.getFullYear());
    setNavMonth(initialDate.getMonth());
  }, [value]);

  const repositionPanel = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < ESTIMATED_PANEL_HEIGHT + PANEL_GAP && spaceAbove >= spaceBelow;
    const left = Math.min(
      rect.left,
      window.innerWidth - PANEL_WIDTH - HORIZONTAL_MARGIN,
    );
    setPanelStyle({
      position: "fixed",
      left: Math.max(HORIZONTAL_MARGIN, left),
      top: openAbove ? undefined : rect.bottom + PANEL_GAP,
      bottom: openAbove ? window.innerHeight - rect.top + PANEL_GAP : undefined,
      width: PANEL_WIDTH,
    });
  }, []);

  // Reset internal state and calculate position when picker opens
  useEffect(() => {
    if (open) {
      const d = tempDate ?? toDate(value);
      setTempDate(d);
      setNavYear(d.getFullYear());
      setNavMonth(d.getMonth());
      setView(mode === "time" ? "time" : "calendar");
      repositionPanel();
    }
  }, [open, value, mode, repositionPanel]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const handle = () => repositionPanel();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open, repositionPanel]);

  // Outside click: close only if click is outside BOTH container and panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideContainer && !insidePanel) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll selected hour/minute into view when time panel opens
  useEffect(() => {
    if (view !== "time" || !open) return;
    requestAnimationFrame(() => {
      const activeDate = tempDate ?? new Date(0);
      if (hoursListRef.current) {
        const btn = hoursListRef.current.querySelector(`[data-hour="${activeDate.getHours()}"]`);
        btn?.scrollIntoView({ block: "nearest" });
      }
      if (minutesListRef.current) {
        const btn = minutesListRef.current.querySelector(`[data-minute="${Math.floor(activeDate.getMinutes() / 5) * 5}"]`);
        btn?.scrollIntoView({ block: "nearest" });
      }
    });
  }, [view, open, tempDate]);

  const now = mounted ? new Date() : new Date(0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const isDateDisabled = useCallback(
    (d: Date) => {
      if (disablePastDates && d < todayStart) return true;
      if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
      if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
      return false;
    },
    [disablePastDates, minDate, maxDate, todayStart],
  );

  const isTimeDisabled = useCallback(
    (h: number, m: number) => {
      if (!disablePastTime && !disablePastDates && !minTime && !maxTime) return false;
      const totalMinutes = h * 60 + m;
      const activeDate = tempDate ?? new Date(0);
      const shouldDisablePast = disablePastTime || (disablePastDates && isToday(activeDate));
      if (shouldDisablePast) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (totalMinutes < nowMin) return true;
      }
      if (minTime) {
        const [mh, mm] = minTime.split(":").map(Number);
        if (totalMinutes < mh * 60 + mm) return true;
      }
      if (maxTime) {
        const [xh, xm] = maxTime.split(":").map(Number);
        if (totalMinutes > xh * 60 + xm) return true;
      }
      return false;
    },
    [disablePastTime, disablePastDates, minTime, maxTime, tempDate, now],
  );

  const safeNavYear = navYear ?? 1970;
  const safeNavMonth = navMonth ?? 0;

  const prevMonth = () => {
    if (safeNavMonth === 0) { setNavYear((y) => (y ?? 1970) - 1); setNavMonth(11); }
    else setNavMonth((m) => (m ?? 0) - 1);
  };

  const nextMonth = () => {
    if (safeNavMonth === 11) { setNavYear((y) => (y ?? 1970) + 1); setNavMonth(0); }
    else setNavMonth((m) => (m ?? 0) + 1);
  };

  const days = useMemo(() => {
    const dim = daysInMonth(safeNavYear, safeNavMonth);
    const first = new Date(safeNavYear, safeNavMonth, 1).getDay();
    const result: (number | null)[] = [];
    for (let i = 0; i < first; i++) result.push(null);
    for (let i = 1; i <= dim; i++) result.push(i);
    return result;
  }, [safeNavYear, safeNavMonth]);

  const selectDate = (day: number) => {
    const d = new Date(safeNavYear, safeNavMonth, day);
    if (isDateDisabled(d)) return;
    const next = new Date(tempDate ?? new Date(0));
    next.setFullYear(safeNavYear, safeNavMonth, day);
    setTempDate(next);
    if (mode === "date") {
      onChange(toDateStr(next));
      setOpen(false);
    } else {
      setView("time");
    }
  };

  const displayValue = useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    if (!mounted) return value;
    if (mode === "date") return formatEnIN(d);
    return formatEnINWithTime(d);
  }, [value, mounted, mode]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const portalContainer = typeof document !== "undefined" ? document.body : null;
  const activeDate = tempDate ?? new Date(0);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex max-w-[340px] items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
                className={cn(
                  "flex h-[46px] flex-1 items-center gap-3 rounded-lg border bg-white/[0.04] px-4 text-sm shadow-inner shadow-white/[0.03] transition-all duration-200",
            open
              ? "border-cyan-400/40 bg-cyan-500/8"
              : "border-white/[0.1] hover:border-white/20",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <div className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            open ? "bg-cyan-500/20 text-cyan-300" : "bg-white/[0.06] text-gray-400",
          )}>
            {mode === "time" ? <Clock className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
          </div>
          <span className={cn(
            "min-w-0 flex-1 text-left text-sm leading-none",
            displayValue ? "text-white font-medium" : "text-gray-400",
          )}>
            {displayValue || placeholder || (mode === "time" ? "Select time" : "Select date")}
          </span>
        </button>
        {displayValue && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-gray-500 transition hover:bg-white/[0.12] hover:text-white"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {portalContainer ? createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed z-[400] overflow-hidden rounded-2xl border border-white/[0.12] bg-slate-950/98 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl"
              style={panelStyle || undefined}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.06)_1px,transparent_1px)] bg-[size:22px_22px] opacity-30" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {mode !== "time" && (
                <div className="relative p-4">
                  {view === "calendar" ? (
                    <>
                      {/* Month/Year Nav */}
                      <div className="mb-4 flex items-center justify-between">
                        <button type="button" onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-white/[0.08] hover:text-white">
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-base font-semibold text-white/90">
                          {MONTHS[safeNavMonth]} {safeNavYear}
                        </span>
                        <button type="button" onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-white/[0.08] hover:text-white">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Weekday Headers */}
                      <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-gray-500 tracking-wide">
                        {WEEKDAYS.map((w) => (
                          <div key={w} className="py-1.5">{w}</div>
                        ))}
                      </div>

                      {/* Days */}
                      <div className="grid grid-cols-7">
                        {days.map((d, i) =>
                          d === null ? (
                            <div key={i} />
                          ) : (
                            <button
                              key={i}
                              type="button"
                              disabled={isDateDisabled(new Date(safeNavYear, safeNavMonth, d))}
                              onClick={() => selectDate(d)}
                              className={cn(
                                "relative mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-all duration-150",
                                isSameDay(activeDate, new Date(safeNavYear, safeNavMonth, d))
                                  ? "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25"
                                  : isToday(new Date(safeNavYear, safeNavMonth, d))
                                    ? "text-cyan-300 ring-1 ring-cyan-500/30"
                                    : "text-gray-300 hover:bg-white/[0.08] hover:text-white",
                                isDateDisabled(new Date(safeNavYear, safeNavMonth, d)) &&
                                  "pointer-events-none opacity-25",
                              )}
                            >
                              {d}
                            </button>
                          ),
                        )}
                      </div>

                      {mode === "datetime" && (
                        <div className="mt-4 border-t border-white/[0.08] pt-3">
                          <button
                            type="button"
                            onClick={() => setView("time")}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/10 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/15"
                          >
                            <Clock className="h-4 w-4" />
                            Continue to time
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {mode === "datetime" && (
                        <div className="mb-4 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setView("calendar")}
                            className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-sm text-gray-300 transition hover:bg-white/[0.1]"
                          >
                            <CalendarDays className="h-4 w-4 text-cyan-400" />
                            {formatEnIN(activeDate)}
                          </button>
                          <span className="text-xs text-gray-500">Select time</span>
                        </div>
                      )}

                      <div className="flex gap-4">
                        {/* Hours scrollable list */}
                        <div className="flex-1">
                          <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Hour</p>
                          <div
                            ref={hoursListRef}
                            className="h-52 overflow-y-auto scroll-smooth rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
                          >
                            {hours.map((h) => {
                              const disabled = isTimeDisabled(h, activeDate.getMinutes());
                              const selected = activeDate.getHours() === h;
                              return (
                                <button
                                  key={h}
                                  type="button"
                                  data-hour={h}
                                  disabled={disabled}
                                  onClick={() => {
                                    const next = new Date(activeDate);
                                    next.setHours(h);
                                    setTempDate(next);
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center rounded-lg py-2 text-sm font-medium transition-all",
                                    selected
                                      ? "bg-gradient-to-r from-cyan-500/30 to-cyan-600/20 text-white"
                                      : "text-gray-400 hover:bg-white/[0.06] hover:text-white",
                                    disabled && "pointer-events-none opacity-25",
                                  )}
                                >
                                  {String(h).padStart(2, "0")}
                                  {selected && <Check className="ml-1 h-3.5 w-3.5 text-cyan-400" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Minutes scrollable list */}
                        <div className="flex-1">
                          <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Min</p>
                          <div
                            ref={minutesListRef}
                            className="h-52 overflow-y-auto scroll-smooth rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
                          >
                            {minutes.map((m) => {
                              const disabled = isTimeDisabled(activeDate.getHours(), m);
                              const selected = activeDate.getMinutes() === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  data-minute={m}
                                  disabled={disabled}
                                  onClick={() => {
                                    const next = new Date(activeDate);
                                    next.setMinutes(m);
                                    setTempDate(next);
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center rounded-lg py-2 text-sm font-medium transition-all",
                                    selected
                                      ? "bg-gradient-to-r from-cyan-500/30 to-cyan-600/20 text-white"
                                      : "text-gray-400 hover:bg-white/[0.06] hover:text-white",
                                    disabled && "pointer-events-none opacity-25",
                                  )}
                                >
                                  {String(m).padStart(2, "0")}
                                  {selected && <Check className="ml-1 h-3.5 w-3.5 text-cyan-400" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-white/[0.08] pt-3">
                        <Button
                          type="button"
                          className="w-full gap-2"
                          onClick={() => {
                            onChange(activeDate.toISOString());
                            setOpen(false);
                          }}
                        >
                          <Check className="h-4 w-4" />
                          {mode === "datetime" ? "Set Date & Time" : "Set Time"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {mode === "time" && (
                <div className="relative p-4">
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Select time</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Hour</p>
                      <div
                        ref={hoursListRef}
                        className="h-56 overflow-y-auto scroll-smooth rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
                      >
                        {hours.map((h) => {
                          const disabled = isTimeDisabled(h, activeDate.getMinutes());
                          const selected = activeDate.getHours() === h;
                          return (
                            <button
                              key={h}
                              type="button"
                              data-hour={h}
                              disabled={disabled}
                              onClick={() => {
                                const next = new Date(activeDate);
                                next.setHours(h);
                                setTempDate(next);
                              }}
                              className={cn(
                                "flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-all",
                                selected
                                  ? "bg-gradient-to-r from-cyan-500/30 to-cyan-600/20 text-white"
                                  : "text-gray-400 hover:bg-white/[0.06] hover:text-white",
                                disabled && "pointer-events-none opacity-25",
                              )}
                            >
                              {String(h).padStart(2, "0")}
                              {selected && <Check className="ml-1 h-3.5 w-3.5 text-cyan-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Min</p>
                      <div
                        ref={minutesListRef}
                        className="h-56 overflow-y-auto scroll-smooth rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
                      >
                        {minutes.map((m) => {
                          const disabled = isTimeDisabled(activeDate.getHours(), m);
                          const selected = activeDate.getMinutes() === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              data-minute={m}
                              disabled={disabled}
                              onClick={() => {
                                const next = new Date(activeDate);
                                next.setMinutes(m);
                                setTempDate(next);
                              }}
                              className={cn(
                                "flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-all",
                                selected
                                  ? "bg-gradient-to-r from-cyan-500/30 to-cyan-600/20 text-white"
                                  : "text-gray-400 hover:bg-white/[0.06] hover:text-white",
                                disabled && "pointer-events-none opacity-25",
                              )}
                            >
                              {String(m).padStart(2, "0")}
                              {selected && <Check className="ml-1 h-3.5 w-3.5 text-cyan-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-white/[0.08] pt-3">
                    <Button
                      type="button"
                      className="w-full gap-2"
                      onClick={() => {
                        onChange(toTimeStr(activeDate));
                        setOpen(false);
                      }}
                    >
                      <Check className="h-4 w-4" />
                      Set Time
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        portalContainer,
      ) : null}
    </div>
  );
}
