"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Boxes,
  CheckCheck,
  ChevronDown,
  CreditCard,
  FileText,
  MessageCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AppNotification,
  buildNotificationHref,
} from "@/store/notification-store";
import { buildEventHref } from "@/lib/event-navigation";

type NotificationCenterPanelProps = {
  items: AppNotification[];
  unread: number;
  title?: string;
  subtitle?: string;
  onMarkAllRead: () => void;
  onClear: () => void;
  onClearRead: () => void;
  onMarkAsRead: (id: string) => void;
  onRemove?: (id: string) => void;
  clearingIds?: Set<string>;
  isBusy?: boolean;
};

type NotificationGroup = {
  key: string;
  notifications: AppNotification[];
};

const typeStyles = {
  billing: {
    label: "Bill",
    icon: FileText,
    className: "bg-sky-500/15 text-sky-200 ring-sky-400/20",
  },
  payment: {
    label: "Payment",
    icon: CreditCard,
    className: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20",
  },
  inventory: {
    label: "Stock",
    icon: Boxes,
    className: "bg-violet-500/15 text-violet-200 ring-violet-400/20",
  },
  chat: {
    label: "Chat",
    icon: MessageCircle,
    className: "bg-orange-500/15 text-orange-200 ring-orange-400/20",
  },
  system: {
    label: "System",
    icon: Bell,
    className: "bg-slate-500/15 text-slate-200 ring-slate-400/20",
  },
} satisfies Record<
  AppNotification["type"],
  { label: string; icon: typeof Bell; className: string }
>;

const actionButtonClass =
  "inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm";
const secondaryActionClass = `${actionButtonClass} bg-orange-400 text-slate-950 shadow-lg shadow-orange-950/20 hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60`;
const outlineActionClass = `${actionButtonClass} border border-white/10 bg-white/[0.055] text-slate-200 backdrop-blur-xl hover:bg-white/[0.09] hover:text-white disabled:cursor-not-allowed disabled:opacity-60`;
const iconActionClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white sm:h-9 sm:w-9";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function displayText(notification: AppNotification) {
  const title =
    (notification.title || "").replace(/#?BILL[-\d]+/gi, "").trim() ||
    notification.title;
  const body = (notification.body || "")
    .replace(/#?BILL[-\d]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { title, body };
}

function groupKey(notification: AppNotification) {
  if (notification.type !== "chat" && notification.meta?.type !== "shop_chat") {
    return `single:${notification.id}`;
  }

  const roomId = notification.meta?.roomId;
  const userId = notification.meta?.userId;
  return `chat:${String(roomId || userId || notification.title)}`;
}

function groupNotifications(items: AppNotification[]) {
  const groups = new Map<string, NotificationGroup>();

  for (const notification of items) {
    const key = groupKey(notification);
    const current = groups.get(key);
    if (current) {
      current.notifications.push(notification);
    } else {
      groups.set(key, { key, notifications: [notification] });
    }
  }

  return Array.from(groups.values());
}

export default function NotificationCenterPanel({
  items,
  unread,
  title = "Notifications",
  subtitle = "Latest chats, bills, payments and system updates",
  onMarkAllRead,
  onClear,
  onClearRead,
  onMarkAsRead,
  onRemove,
  clearingIds = new Set<string>(),
  isBusy,
}: NotificationCenterPanelProps) {
  const hasRead = items.some((notification) => !!notification.read);
  const isClearing = Boolean(isBusy || clearingIds.size > 0);
  const groups = useMemo(() => groupNotifications(items), [items]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, true>>(
    {},
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: true };
    });
  };

  const markGroupAsRead = (notifications: AppNotification[]) => {
    notifications.forEach((notification) => onMarkAsRead(notification.id));
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-2 pb-3 pt-0 sm:px-4 sm:pb-4 sm:pt-2 lg:px-6">
      <div className="relative flex min-h-[calc(var(--app-vh,100dvh)-1rem)] flex-col overflow-hidden rounded-[1.15rem] border border-sky-300/15 bg-slate-950/62 text-slate-100 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:min-h-[calc(var(--app-vh,100dvh)-2rem)] sm:rounded-[1.35rem]">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-orange-300/12 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(125,211,252,0.20)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.20)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative border-b border-white/10 bg-white/[0.045] px-3 py-3 backdrop-blur-2xl sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-normal sm:text-2xl">
                  {title}
                </h1>
                <Badge className="h-5 rounded-full border-cyan-300/20 bg-cyan-300/10 px-2 text-[11px] text-cyan-100 sm:h-6 sm:text-xs">
                  {unread} new
                </Badge>
                <Badge className="h-5 rounded-full border-orange-300/20 bg-orange-300/10 px-2 text-[11px] text-orange-100 sm:h-6 sm:text-xs">
                  {items.length} total
                </Badge>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-slate-400 sm:text-sm">
                {subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  className={secondaryActionClass}
                  onClick={onMarkAllRead}
                  disabled={isClearing}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark all
                </button>
              )}
              {hasRead && (
                <button
                  type="button"
                  className={outlineActionClass}
                  onClick={onClearRead}
                  disabled={isClearing}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear read
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  className={outlineActionClass}
                  onClick={onClear}
                  disabled={isClearing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isClearing ? "Clearing" : "Clear"}
                </button>
              )}
            </div>
          </div>
        </div>

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className={`relative flex-1 overflow-auto bg-slate-950/28 px-1 py-1 transition-[max-height] duration-300 ease-out sm:px-2 sm:py-2 ${
            isClearing
              ? "max-h-[calc(var(--app-vh,100dvh)-7rem)]"
              : "max-h-[calc(var(--app-vh,100dvh)-5.5rem)]"
          }`}
        >
          {items.length === 0 ? (
            <motion.div
              layout
              className="grid min-h-full place-items-center px-6 py-8 text-center"
            >
              <div className="max-w-sm">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-orange-200 shadow-lg shadow-orange-950/20 backdrop-blur-xl">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="mx-auto mt-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  Notification center
                </div>
                <p className="mt-4 text-base font-semibold text-slate-200">
                  No notifications yet
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  New chat replies, bill updates, service alerts, and payment
                  reminders will appear here.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="space-y-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 1 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.035 },
                },
              }}
            >
              <AnimatePresence initial={false} mode="popLayout">
              {groups.map((group, groupIndex) => {
                const notification = group.notifications[0];
                const groupCount = group.notifications.length;
                const expanded = Boolean(expandedGroups[group.key]);
                const groupUnread = group.notifications.filter(
                  (item) => !item.read,
                ).length;
                const style = typeStyles[notification.type];
                const Icon = style.icon;
                const eventHref = buildEventHref(notification);
                const href = buildNotificationHref(notification);
                const finalHref = eventHref || href;
                const { title: displayTitle, body: displayBody } =
                  displayText(notification);
                const groupClearing =
                  clearingIds.size > 0 &&
                  group.notifications.every((item) => clearingIds.has(item.id));
                const canSwipeRemove = Boolean(onRemove && groupCount === 1 && !isClearing);

                const content = (
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 sm:h-10 sm:w-10 ${style.className}`}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-[13px] font-semibold leading-5 text-slate-100 sm:text-sm">
                          {displayTitle}
                        </span>
                        <Badge className="h-5 rounded-full border-slate-700 bg-slate-900 px-2 text-[10px] text-slate-300 sm:text-[11px]">
                          {style.label}
                        </Badge>
                        {groupCount > 1 && (
                          <Badge className="h-5 rounded-full border-orange-400/20 bg-orange-500/15 px-2 text-[10px] text-orange-200 sm:text-[11px]">
                            {groupCount} Messages
                          </Badge>
                        )}
                        {groupUnread > 0 && (
                          <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_0_4px_rgba(251,146,60,0.12)]" />
                        )}
                      </div>
                      {displayBody && groupCount === 1 && (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-400 sm:text-[13px]">
                          {displayBody}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-[11px]">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <motion.article
                    key={group.key}
                    layout
                    drag={canSwipeRemove ? "x" : false}
                    dragElastic={0.08}
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (!canSwipeRemove) return;
                      if (Math.abs(info.offset.x) > 92 || Math.abs(info.velocity.x) > 650) {
                        onRemove?.(notification.id);
                      }
                    }}
                    animate={
                      groupClearing
                        ? {
                            opacity: 0,
                            x: 120,
                            scale: 0.96,
                            filter: "blur(3px)",
                          }
                        : "visible"
                    }
                    variants={{
                      hidden: { opacity: 0, y: 10, scale: 0.98 },
                      visible: { opacity: 1, y: 0, scale: 1 },
                    }}
                    exit={{
                      opacity: 0,
                      x: 120,
                      scale: 0.96,
                      filter: "blur(3px)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                      mass: 0.7,
                      delay: groupClearing ? groupIndex * 0.055 : 0,
                    }}
                    className={`touch-pan-y rounded-[1rem] border px-2 py-2 shadow-lg shadow-black/10 backdrop-blur-xl transition hover:border-cyan-300/25 hover:bg-white/[0.075] sm:rounded-[1.25rem] sm:px-3 sm:py-2.5 ${
                      groupUnread === 0
                        ? "border-white/10 bg-white/[0.04]"
                        : "border-orange-300/20 bg-orange-300/[0.06]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {finalHref ? (
                        <Link
                          href={finalHref}
                          className="min-w-0 flex-1"
                          onClick={() => markGroupAsRead(group.notifications)}
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}

                      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        {groupCount > 1 && (
                          <button
                            type="button"
                            className={iconActionClass}
                            onClick={() => toggleGroup(group.key)}
                            aria-label={
                              expanded
                                ? "Collapse notifications"
                                : "Expand notifications"
                            }
                            aria-expanded={expanded}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                        {finalHref && (
                          <Link
                            href={finalHref}
                            className={secondaryActionClass}
                            onClick={() => markGroupAsRead(group.notifications)}
                          >
                            Open
                          </Link>
                        )}
                        {groupUnread > 0 && (
                          <button
                            type="button"
                            className={iconActionClass}
                            onClick={() => markGroupAsRead(group.notifications)}
                            aria-label="Mark notification as read"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </button>
                        )}
                        {onRemove && groupCount === 1 && (
                          <button
                            type="button"
                            className={iconActionClass}
                            onClick={() => onRemove(notification.id)}
                            disabled={isClearing}
                            aria-label="Remove notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {expanded && groupCount > 1 && (
                        <motion.div
                          key="expanded-stack"
                          initial={{ height: 0, opacity: 0, y: -6 }}
                          animate={{ height: "auto", opacity: 1, y: 0 }}
                          exit={{ height: 0, opacity: 0, y: -6 }}
                          transition={{
                            type: "spring",
                            stiffness: 360,
                            damping: 32,
                          }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 space-y-1 rounded-[0.95rem] border border-white/10 bg-slate-950/42 p-1 backdrop-blur-xl sm:rounded-[1.1rem]">
                            {group.notifications.map((item, index) => {
                              const itemHref =
                                buildEventHref(item) ||
                                buildNotificationHref(item);
                              const { body } = displayText(item);
                              const itemUnread = !item.read;

                              const preview = (
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                                      itemUnread
                                        ? "bg-orange-400"
                                        : "bg-slate-600"
                                    }`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-xs leading-4 text-slate-200 sm:text-[13px]">
                                      {body || item.title}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px]">
                                      {formatTime(item.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              );

                              const itemClass =
                                "block rounded-[0.8rem] px-2.5 py-1.5 transition hover:bg-white/[0.08] sm:rounded-[0.9rem] sm:px-3 sm:py-2";

                              return (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    delay: index * 0.025,
                                    duration: 0.18,
                                  }}
                                >
                                  {itemHref ? (
                                    <Link
                                      href={itemHref}
                                      className={`${itemClass} ${
                                        itemUnread
                                          ? "bg-orange-300/[0.06]"
                                          : "bg-white/[0.035]"
                                      }`}
                                      onClick={() => onMarkAsRead(item.id)}
                                    >
                                      {preview}
                                    </Link>
                                  ) : (
                                    <div
                                      className={`${itemClass} ${
                                        itemUnread
                                          ? "bg-orange-300/[0.06]"
                                          : "bg-white/[0.035]"
                                      }`}
                                    >
                                      {preview}
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
