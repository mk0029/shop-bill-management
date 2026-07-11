export type PaymentStatus = "pending" | "paid" | "partial" | "overdue";

export type VerificationStatus =
  | "unverified"
  | "verifying"
  | "verified"
  | "failed";

export interface BillReference {
  full: string;
  short: string;
  billNumber: string;
  date: string;
}

export interface PaymentRecord {
  billId: string;
  billNumber: string;
  billReference: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  status: PaymentStatus;
  paymentTime?: string;
  verifiedBy?: string;
  verificationTime?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface PaymentVerificationRequest {
  billId: string;
  verifiedBy: string;
  paymentTime?: string;
  transactionId?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  billId: string;
  status: PaymentStatus;
  message: string;
}

export interface PaymentProviderConfig {
  name: string;
  type: "manual" | "razorpay" | "cashfree" | "phonepe" | "payu";
  enabled: boolean;
}

export interface GatewayPaymentResult {
  success: boolean;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount: number;
  status: string;
}

export interface VerifyPaymentInput {
  billId: string;
  amount: number;
  transactionId?: string;
  paymentTime?: string;
}

export interface VerifyPaymentOutput {
  verified: boolean;
  billId: string;
  paymentStatus: PaymentStatus;
  message: string;
}
