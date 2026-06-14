export const NOTIFICATION_EVENT_TYPES = [
  "chat.message.created",
  "bill.message.created",
  "bill_created",
  "admin_bill_created",
  "billing.created",
  "billing.updated",
  "workTask.created",
  "workTask.updated",
  "workTask.completed",
  "workTask.cancelled",
  "workTask.cancle",
  "workTask.hold",
  "toolRent.created",
  "toolRent.updated",
  "toolRent.returnDue",
  "scheduled.dailyGreeting",
  "scheduled.festivalGreeting",
  "system.general",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export type NotificationData = Record<string, string | number | boolean | null | undefined>;

export type SendNotificationEventInput = {
  type: NotificationEventType;
  userId?: string;
  userIds?: string[];
  actorUserId?: string;
  title: string;
  body: string;
  data?: NotificationData;
  eventId?: string;
  skipActor?: boolean;
};

export type FcmDeviceInfo = {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  browser?: string;
  os?: string;
  userAgent?: string;
};

export type RegisterFcmTokenInput = {
  userId: string;
  token?: string;
  deviceInfo?: FcmDeviceInfo;
};

export type NotificationSendResult = {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
  invalidTokens?: string[];
};
