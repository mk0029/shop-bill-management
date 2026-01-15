"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notification-store";
// import AdminTestPushPanel from "@/components/notifications/AdminTestPushPanel"
import AdminFCMInitializer from "@/components/notifications/AdminFCMInitializer";
// Removed sound toggle per request
import AdminTestPushPanel from "@/components/notifications/AdminTestPushPanel";
import SWNotificationBridge from "@/components/notifications/sw-bridge";
import { buildNotificationHref } from "@/store/notification-store";
import Link from "next/link";
import { useDataStore } from "@/store/data-store";

export default function AdminNotificationsPage({
  composerOpen,
  setComposerOpen,
}) {
  const { items, unread, markAllRead, clear, markAsRead } =
    useNotificationStore();
  const { bills, users } = useDataStore();

  return (
    <div className="p-4 sm:p-6">
      <SWNotificationBridge />
      <AdminFCMInitializer />
      <AdminTestPushPanel
        composerOpen={composerOpen}
        setComposerOpen={setComposerOpen}
      />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Notifications
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
          {items.length > 0 && (
            <Button size="sm" variant="outline" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800">
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => {
            const href = buildNotificationHref(n);

            // Resolve customer from billId for billing notifications and build friendly text
            const billId = n?.meta?.billId;
            const bill = billId ? bills?.get?.(billId) : undefined;
            const customerFromBill = bill?.customer;
            const customerId = customerFromBill?._id;
            const customerFromUsers = customerId
              ? users?.get?.(customerId)
              : undefined;
            const derivedUser =
              n?.meta?.user || customerFromBill || customerFromUsers;

            const customerName = derivedUser?.name;
            const lowerTitle = (n.title || "").toLowerCase();
            const action =
              n?.meta?.action ||
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

            return (
              <div key={n.id} className="p-4 flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge variant="secondary" className="capitalize">
                    {n.type}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{displayTitle}</p>
                  <p className="text-gray-400 text-sm whitespace-pre-line">
                    {displayBody}
                  </p>

                  {(derivedUser || n.meta?.userId) && (
                    <p className="text-gray-400 text-xs mt-1">
                      {derivedUser?.name && (
                        <span className="mr-2">{derivedUser.name}</span>
                      )}
                      {derivedUser?.email && (
                        <span className="mr-2">({derivedUser.email})</span>
                      )}
                      {/* If you want to show the ID, uncomment below:
                      <span className="text-gray-500">ID: {derivedUser?._id || derivedUser?.id || n.meta?.userId}</span>
                      */}
                    </p>
                  )}
                  <p className="text-gray-500 text-[9px] md:text-[11px] mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {href && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={href}>Open</Link>
                    </Button>
                  )}
                  {!n.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsRead(n.id)}
                    >
                      Mark read
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
