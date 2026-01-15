"use client";

import React from "react";
import { useNotificationStore } from "@/store/notification-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import AdminTestPushPanel from "@/components/notifications/AdminTestPushPanel"
import AdminFCMInitializer from "@/components/notifications/AdminFCMInitializer";
// Removed sound toggle per request
import Link from "next/link";
import { buildNotificationHref } from "@/store/notification-store";
import SWNotificationBridge from "@/components/notifications/sw-bridge";
import AdminTestPushPanel from "@/components/notifications/AdminTestPushPanel";
import { CheckCheckIcon } from "lucide-react";
import { useDataStore } from "@/store/data-store";

type Props = {
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
  onNavigate?: () => void;
};
export default function AdminNotificationsPage({
  composerOpen,
  setComposerOpen,
  onNavigate,
}: Props) {
  const { items, unread, markAllRead, clear, markAsRead, clearRead } =
    useNotificationStore();
  const { bills, users } = useDataStore() as any;

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
            // Derive customer details from bill when only billId is present in meta
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
            // Build friendlier title/body for billing events
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
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{displayTitle}</p>
                  {/* {(derivedUser || (n as any)?.meta?.userId) && (
                    <p className="text-white/80 text-sm mt-1">
                      {(derivedUser as any)?.name && <span className="mr-2">{(derivedUser as any).name}</span>}
                      {(derivedUser as any)?.email && <span className="mr-2">({(derivedUser as any).email})</span>}
                      <span className="text-gray-500">ID: {(derivedUser as any)?._id || (derivedUser as any)?.id || (n as any)?.meta?.userId}</span>
                    </p>
                  )} */}
                  <p className="text-gray-400 text-xs sm:text-sm whitespace-pre-line capitalize">
                    {displayBody}
                  </p>

                  <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {href && (
                    <Link
                      href={href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      onClick={() => {
                        try {
                          markAsRead(n.id);
                        } catch {}
                        try {
                          onNavigate?.();
                        } catch {}
                      }}
                    >
                      Open
                    </Link>
                  )}
                  {!n.read && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAsRead(n.id)}
                    >
                      <CheckCheckIcon className="w-4 h-4" />
                    </Button>
                  )}
                  {n.read && (
                    <Button disabled size="sm" onClick={() => markAsRead(n.id)}>
                      <CheckCheckIcon className="w-4 h-4 text-white" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => {
            const href = buildNotificationHref(n);
            // Derive customer details from bill when only billId is present in meta
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
            // Build friendlier title/body for billing events
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
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{displayTitle}</p>
                  {/* {(derivedUser || (n as any)?.meta?.userId) && (
                    <p className="text-white/80 text-sm mt-1">
                      {(derivedUser as any)?.name && <span className="mr-2">{(derivedUser as any).name}</span>}
                      {(derivedUser as any)?.email && <span className="mr-2">({(derivedUser as any).email})</span>}
                      <span className="text-gray-500">ID: {(derivedUser as any)?._id || (derivedUser as any)?.id || (n as any)?.meta?.userId}</span>
                    </p>
                  )} */}
                  <p className="text-gray-400 text-xs sm:text-sm whitespace-pre-line capitalize">
                    {displayBody}
                  </p>

                  <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {href && (
                    <Link
                      href={href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      onClick={() => {
                        try {
                          markAsRead(n.id);
                        } catch {}
                        try {
                          onNavigate?.();
                        } catch {}
                      }}
                    >
                      Open
                    </Link>
                  )}
                  {!n.read && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAsRead(n.id)}
                    >
                      <CheckCheckIcon className="w-4 h-4" />
                    </Button>
                  )}
                  {n.read && (
                    <Button disabled size="sm" onClick={() => markAsRead(n.id)}>
                      <CheckCheckIcon className="w-4 h-4 text-white" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => {
            const href = buildNotificationHref(n);
            // Derive customer details from bill when only billId is present in meta
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
            // Build friendlier title/body for billing events
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
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{displayTitle}</p>
                  {/* {(derivedUser || (n as any)?.meta?.userId) && (
                    <p className="text-white/80 text-sm mt-1">
                      {(derivedUser as any)?.name && <span className="mr-2">{(derivedUser as any).name}</span>}
                      {(derivedUser as any)?.email && <span className="mr-2">({(derivedUser as any).email})</span>}
                      <span className="text-gray-500">ID: {(derivedUser as any)?._id || (derivedUser as any)?.id || (n as any)?.meta?.userId}</span>
                    </p>
                  )} */}
                  <p className="text-gray-400 text-xs sm:text-sm whitespace-pre-line capitalize">
                    {displayBody}
                  </p>

                  <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {href && (
                    <Link
                      href={href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      onClick={() => {
                        try {
                          markAsRead(n.id);
                        } catch {}
                        try {
                          onNavigate?.();
                        } catch {}
                      }}
                    >
                      Open
                    </Link>
                  )}
                  {!n.read && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAsRead(n.id)}
                    >
                      <CheckCheckIcon className="w-4 h-4" />
                    </Button>
                  )}
                  {n.read && (
                    <Button disabled size="sm" onClick={() => markAsRead(n.id)}>
                      <CheckCheckIcon className="w-4 h-4 text-white" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => {
            const href = buildNotificationHref(n);
            // Derive customer details from bill when only billId is present in meta
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
            // Build friendlier title/body for billing events
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
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{displayTitle}</p>
                  {/* {(derivedUser || (n as any)?.meta?.userId) && (
                    <p className="text-white/80 text-sm mt-1">
                      {(derivedUser as any)?.name && <span className="mr-2">{(derivedUser as any).name}</span>}
                      {(derivedUser as any)?.email && <span className="mr-2">({(derivedUser as any).email})</span>}
                      <span className="text-gray-500">ID: {(derivedUser as any)?._id || (derivedUser as any)?.id || (n as any)?.meta?.userId}</span>
                    </p>
                  )} */}
                  <p className="text-gray-400 text-xs sm:text-sm whitespace-pre-line capitalize">
                    {displayBody}
                  </p>

                  <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {href && (
                    <Link
                      href={href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      onClick={() => {
                        try {
                          markAsRead(n.id);
                        } catch {}
                        try {
                          onNavigate?.();
                        } catch {}
                      }}
                    >
                      Open
                    </Link>
                  )}
                  {!n.read && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAsRead(n.id)}
                    >
                      <CheckCheckIcon className="w-4 h-4" />
                    </Button>
                  )}
                  {n.read && (
                    <Button disabled size="sm" onClick={() => markAsRead(n.id)}>
                      <CheckCheckIcon className="w-4 h-4 text-white" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => {
            const href = buildNotificationHref(n);
            // Derive customer details from bill when only billId is present in meta
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
            // Build friendlier title/body for billing events
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
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{displayTitle}</p>
                  {/* {(derivedUser || (n as any)?.meta?.userId) && (
                    <p className="text-white/80 text-sm mt-1">
                      {(derivedUser as any)?.name && <span className="mr-2">{(derivedUser as any).name}</span>}
                      {(derivedUser as any)?.email && <span className="mr-2">({(derivedUser as any).email})</span>}
                      <span className="text-gray-500">ID: {(derivedUser as any)?._id || (derivedUser as any)?.id || (n as any)?.meta?.userId}</span>
                    </p>
                  )} */}
                  <p className="text-gray-400 text-xs sm:text-sm whitespace-pre-line capitalize">
                    {displayBody}
                  </p>

                  <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {href && (
                    <Link
                      href={href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      onClick={() => {
                        try {
                          markAsRead(n.id);
                        } catch {}
                        try {
                          onNavigate?.();
                        } catch {}
                      }}
                    >
                      Open
                    </Link>
                  )}
                  {!n.read && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAsRead(n.id)}
                    >
                      <CheckCheckIcon className="w-4 h-4" />
                    </Button>
                  )}
                  {n.read && (
                    <Button disabled size="sm" onClick={() => markAsRead(n.id)}>
                      <CheckCheckIcon className="w-4 h-4 text-white" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => {
            const href = buildNotificationHref(n);
            // Derive customer details from bill when only billId is present in meta
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
            // Build friendlier title/body for billing events
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
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{displayTitle}</p>
                  {/* {(derivedUser || (n as any)?.meta?.userId) && (
                    <p className="text-white/80 text-sm mt-1">
                      {(derivedUser as any)?.name && <span className="mr-2">{(derivedUser as any).name}</span>}
                      {(derivedUser as any)?.email && <span className="mr-2">({(derivedUser as any).email})</span>}
                      <span className="text-gray-500">ID: {(derivedUser as any)?._id || (derivedUser as any)?.id || (n as any)?.meta?.userId}</span>
                    </p>
                  )} */}
                  <p className="text-gray-400 text-xs sm:text-sm whitespace-pre-line capitalize">
                    {displayBody}
                  </p>

                  <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {href && (
                    <Link
                      href={href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      onClick={() => {
                        try {
                          markAsRead(n.id);
                        } catch {}
                        try {
                          onNavigate?.();
                        } catch {}
                      }}
                    >
                      Open
                    </Link>
                  )}
                  {!n.read && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAsRead(n.id)}
                    >
                      <CheckCheckIcon className="w-4 h-4" />
                    </Button>
                  )}
                  {n.read && (
                    <Button disabled size="sm" onClick={() => markAsRead(n.id)}>
                      <CheckCheckIcon className="w-4 h-4 text-white" />
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
