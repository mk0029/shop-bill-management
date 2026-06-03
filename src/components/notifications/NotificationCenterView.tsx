"use client";

import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  MessageCircle,
  Receipt,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AppNotification,
  buildNotificationHref,
} from "@/store/notification-store";
import { buildEventHref, shouldOpenAsModal } from "@/lib/event-navigation";

type Props = {
  items: AppNotification[];
  unread: number;
  title?: string;
  subtitle?: string;
  onMarkAllRead: () => void;
  onClear: () => void;
  onClearRead: () => void;
  onMarkAsRead: (id: string) => void;
};

function typeLabel(notification: AppNotification) {
  if (notification.type === "chat" || notification.meta?.type === "shop_chat") {
    return "Chat";
  }
  if (notification.type === "billing") return "Billing";
  if (notification.type === "payment") return "Payment";
  if (notification.type === "inventory") return "Stock";
  return "System";
}

function typeIcon(notification: AppNotification) {
  if (notification.type === "chat" || notification.meta?.type === "shop_chat") {
    return MessageCircle;
  }
  if (notification.type === "billing" || notification.type === "payment") {
    return Receipt;
  }
  return Bell;
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 60 * 60_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.max(1, Math.floor(diff / (60 * 60_000)))}h ago`;
  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationCenterView({
  items,
  unread,
  title = "Notifications",
  subtitle = "Recent activity and chat updates",
  onMarkAllRead,
  onClear,
  onClearRead,
  onMarkAsRead,
}: Props) {
  const hasRead = items.some((item) => item.read);

  return (
    <div className="mx-auto flex min-h-[72dvh] w-full max-w-6xl flex-col px-4 py-5 sm:px-6">
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-2xl shadow-black/25 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300">
            <span className="font-semibold text-white">{unread}</span> unread
          </div>
          {unread > 0 && (
            <Button size="sm" variant="secondary" onClick={onMarkAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all
            </Button>
          )}
          {hasRead && (
            <Button size="sm" variant="outline" onClick={onClearRead}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear read
            </Button>
          )}
          {items.length > 0 && (
            <Button size="sm" variant="outline" onClick={onClear}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/65">
        {items.length === 0 ? (
          <div className="grid min-h-[44dvh] place-items-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-slate-400">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-white">
                No notifications yet
              </p>
              <p className="mt-1 text-sm text-slate-400">
                New chat messages and shop updates will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[68dvh] divide-y divide-slate-800/80 overflow-y-auto">
            {items.map((notification) => {
              const Icon = typeIcon(notification);
              const eventHref = buildEventHref(notification);
              const href = buildNotificationHref(notification);
              const finalHref = eventHref || href;
              const modalLink = shouldOpenAsModal(notification);

              return (
                <div
                  key={notification.id}
                  className={`group grid gap-3 p-4 transition sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                    notification.read
                      ? "bg-slate-950/30"
                      : "bg-slate-900/70 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start gap-3 sm:contents">
                    <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-200 ring-1 ring-slate-700">
                      <Icon className="h-5 w-5" />
                      {!notification.read && (
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-orange-400" />
                      )}
                    </div>
                    <div className="min-w-0 sm:hidden">
                      <NotificationText notification={notification} />
                    </div>
                  </div>

                  <div className="hidden min-w-0 sm:block">
                    <NotificationText notification={notification} />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <span className="hidden rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 sm:inline-flex">
                      {typeLabel(notification)}
                    </span>
                    {finalHref && (
                      <Link
                        href={finalHref}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                        onClick={() => {
                          if (!notification.read) onMarkAsRead(notification.id);
                          if (modalLink) {
                            try {
                              const dialog = document.querySelector(
                                '[role="dialog"], .modal, .popover, .overlay',
                              ) as HTMLElement | null;
                              if (dialog) dialog.style.display = "none";
                            } catch {}
                          }
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </Link>
                    )}
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onMarkAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationText({ notification }: { notification: AppNotification }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300 sm:hidden">
          {typeLabel(notification)}
        </span>
        <p className="truncate text-sm font-semibold text-white sm:text-base">
          {notification.title}
        </p>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
        {notification.body}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {timeLabel(notification.createdAt)}
      </p>
    </>
  );
}
