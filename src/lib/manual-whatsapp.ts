export type ManualWhatsAppShareType =
  | "bill"
  | "payment"
  | "customer"
  | "work_request"
  | "reminder";

export interface ManualWhatsAppPayload {
  shareType: ManualWhatsAppShareType;
  customerId: string;
  billId?: string;
  paymentId?: string;
  workRequestId?: string;
  forceResend?: boolean;
}

export interface ManualWhatsAppResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
  audit?: {
    senderAdminId: string | null;
    senderRole: string | null;
    customerId: string;
    billId?: string;
    status: "sent" | "failed";
    sentAt: string;
  };
}

export async function sendManualWhatsApp(
  payload: ManualWhatsAppPayload,
): Promise<ManualWhatsAppResult> {
  const res = await fetch("/api/whatsapp/manual-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  return {
    success: Boolean(json?.success),
    error: json?.error,
    rateLimited: Boolean(json?.rateLimited),
    audit: json?.audit,
  };
}