"use client";

import CustomerNotificationsClient from "@/components/customer/customer-notifications-client";

export default function CustomerNotificationsPage({
  onRequestClose,
}: {
  onRequestClose?: () => void;
}) {
  return <CustomerNotificationsClient onRequestClose={onRequestClose} />;
}
