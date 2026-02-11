"use client";

import React from "react";
import { useNotificationStore } from "@/store/notification-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buildNotificationHref } from "@/store/notification-store";
import { buildEventHref, shouldOpenAsModal } from "@/lib/event-navigation";
import SWNotificationBridge from "@/components/notifications/sw-bridge";
import { CheckCheckIcon } from "lucide-react";
import { useDataStore } from "@/store/data-store";
import { useAuthStore } from "@/store/auth-store";
import { listNotifications } from "@/lib/notifications-dataset";
import { useEffect } from "react";

export default function CustomerNotificationsClient() {
  const { items, unread, markAllRead, clear, markAsRead, clearRead, addMany } =
    useNotificationStore();
  const { bills, users } = useDataStore() as any;
  const user = useAuthStore((s) => s.user) as {
    id?: string;
    _id?: string;
    role?: string;
    phone?: string;
  } | null;
  const userId = user?._id || user?.id;
  const role = user?.role;

  useEffect(() => {
    let cancelled = false;
    if (!userId && !user?.phone && role !== "admin") return;
    void (async () => {
      try {
        const resp = await listNotifications({
          userId: userId || undefined,
          role: role || undefined,
          phone: user?.phone || undefined,
          limit: 50,
        });
        const serverItems = Array.isArray((resp as any)?.items)
          ? (resp as any).items
          : [];
        const mapped = serverItems
          .map((n: any) => {
            const createdAt = String(n?.createdAt || new Date().toISOString());
            const event =
              typeof n?.event === "string"
                ? n.event
                : typeof n?.data?.event === "string"
                  ? n.data.event
                  : "";
            const type = (() => {
              if (event === "bill-created" || event === "bill-updated")
                return "billing";
              if (event && String(event).includes("payment")) return "payment";
              return "system";
            })();
            return {
              id: String(n?._id || ""),
              type,
              title: String(n?.title || ""),
              body: String(n?.body || ""),
              createdAt,
              read: false,
              meta: {
                source: "push",
                billId: n?.billId || n?.data?.billId,
                userId: n?.customerId || n?.data?.customerId,
              },
            };
          })
          .filter((x: any) => x.id && x.title && x.body);
        if (!cancelled && mapped.length) addMany(mapped as any);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, role, user?.phone, addMany]);

  return (
    <div className="p-4 sm:p-6">
      <SWNotificationBridge />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-white">
            Notifications
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>
              Mark all
            </Button>
          )}
          {(items || []).some((n) => !!n.read) && (
            <Button size="sm" variant="outline" onClick={clearRead}>
              Clear Read
            </Button>
          )}
          {items.length > 0 && (
            <Button size="sm" variant="outline" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800 max-h-[70dvh] overflow-auto">
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => {
            const href = buildNotificationHref(n);
            const eventHref = buildEventHref(n);
            const finalHref = eventHref || href;
            const shouldUseModal = shouldOpenAsModal(n);

            const billId = (n as any)?.meta?.billId as string | undefined;
            const bill = billId
              ? (bills as Map<string, any>)?.get?.(billId)
              : undefined;
            const customerFromBill = bill?.customer;
            const customerId = customerFromBill?._id;
            const customerFromUsers = customerId
              ? (users as Map<string, any>)?.get?.(customerId)
              : undefined;
            const derivedUser =
              (n as any)?.meta?.user || customerFromBill || customerFromUsers;
            const customerName = (derivedUser as any)?.name;
            const lowerTitle = (n.title || "").toLowerCase();
            const action =
              (n as any)?.meta?.action ||
              (lowerTitle.includes("bill updated")
                ? "updated"
                : lowerTitle.includes("bill created")
                  ? "created"
                  : undefined);
            const displayTitle =
              customerName && action
                ? `Bill ${action} for ${customerName}`
                : (n.title || "").replace(/#?BILL[-\d]+/gi, "").trim() ||
                  n.title;
            const displayBody = (n.body || "")
              .replace(/#?BILL[-\d]+/gi, "")
              .replace(/\s{2,}/g, " ")
              .trim();

            const notificationContent = (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{displayTitle}</p>
                <p className="text-gray-400 text-xs sm:text-sm whitespace-pre-line capitalize">
                  {displayBody}
                </p>
                <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            );

            return (
              <div key={n.id} className="p-4 flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge
                    variant="secondary"
                    className="capitalize max-sm:!text-xs "
                  >
                    {n.type}
                  </Badge>
                </div>

                {finalHref ? (
                  <Link
                    href={finalHref}
                    className="flex-1 hover:bg-gray-800 rounded-md p-2 -m-2 transition-colors"
                    onClick={() => {
                      try {
                        if (!n.read) {
                          markAsRead(n.id);
                        }
                      } catch {}
                    }}
                  >
                    {notificationContent}
                  </Link>
                ) : (
                  notificationContent
                )}

                <div className="flex items-center gap-1">
                  {finalHref && (
                    <Link
                      href={finalHref}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      onClick={() => {
                        try {
                          markAsRead(n.id);
                          // Close notification window if it's a modal/overlay
                          const notificationElement = (
                            document.activeElement as HTMLElement
                          )?.closest(
                            '[role="dialog"], .modal, .popover, .overlay',
                          );
                          if (notificationElement) {
                            (notificationElement as HTMLElement).style.display =
                              "none";
                          }
                          // Also try to close any parent modal
                          const parentModal = document.querySelector(
                            '.modal.show, [data-state="open"]',
                          );
                          if (parentModal) {
                            (parentModal as HTMLElement).style.display = "none";
                          }
                        } catch {}
                      }}
                    >
                      Open
                    </Link>
                  )}
                  {!n.read ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAsRead(n.id)}
                      title="Mark as read"
                    >
                      <CheckCheckIcon className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      title="Already read"
                    >
                      <CheckCheckIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
