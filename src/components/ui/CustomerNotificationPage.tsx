"use client";

import CustomerNotificationsClient from "@/components/customer/customer-notifications-client";

export default function CustomerNotificationsPage({
  onRequestClose,
  onRequestCloseSilent,
}: {
  onRequestClose?: () => void;
  onRequestCloseSilent?: () => void;
}) {
  return (
    <CustomerNotificationsClient
      onRequestClose={onRequestClose}
      onRequestCloseSilent={onRequestCloseSilent}
    />
  );
}
