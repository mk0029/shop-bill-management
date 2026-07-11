export type ReminderChannel = "whatsapp" | "email";

export interface CustomerReminderConfig {
  reminderEnabled: boolean;
  firstReminderOffsetDays: number;
  reminderIntervalDays: number;
  preferredReminderTime?: string;
  preferredChannels: ReminderChannel[];
  maximumReminderCount?: number;
  stopAfterPayment: boolean;
}

export interface GlobalReminderSettings {
  autoReminderEnabled: boolean;
  defaultFirstReminderOffsetDays: number;
  defaultReminderIntervalDays: number;
  defaultSendTime: string;
  timezone: string;
  minimumPendingAmount: number;
  allowManualReminder: boolean;
}

export interface ReminderCandidate {
  customerId: string;
  billId: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string;
  billDate: string;
  lastReminderSentAt?: string;
  reminderCount: number;
}

export interface ReminderResult {
  customerId: string;
  billId: string;
  channel: ReminderChannel;
  sent: boolean;
  skipped: boolean;
  reason?: string;
  idempotencyKey: string;
}

export interface ReminderRunReport {
  date: string;
  customersProcessed: number;
  remindersSent: number;
  remindersSkipped: number;
  errors: number;
  results: ReminderResult[];
}
