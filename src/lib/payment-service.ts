import type {
  PaymentRecord,
  PaymentStatus,
  PaymentVerificationResult,
  VerifyPaymentInput,
  VerifyPaymentOutput,
  PaymentProviderConfig,
} from "@/types/payment";

export interface PaymentProvider {
  readonly config: PaymentProviderConfig;

  verify(input: VerifyPaymentInput): Promise<VerifyPaymentOutput>;

  markAsPaid(
    billId: string,
    verifiedBy: string,
    transactionId?: string
  ): Promise<PaymentVerificationResult>;
}

export class ManualUpiProvider implements PaymentProvider {
  readonly config: PaymentProviderConfig = {
    name: "Manual UPI",
    type: "manual",
    enabled: true,
  };

  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    try {
      const res = await fetch(`/api/bills/${input.billId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        return {
          verified: false,
          billId: input.billId,
          paymentStatus: "pending",
          message: "Failed to fetch bill status",
        };
      }
      const bill = await res.json();
      const status: PaymentStatus =
        bill.paymentStatus === "paid"
          ? "paid"
          : bill.paymentStatus === "partial"
            ? "partial"
            : "pending";

      return {
        verified: status === "paid" || status === "partial",
        billId: input.billId,
        paymentStatus: status,
        message:
          status === "paid"
            ? "Payment confirmed"
            : status === "partial"
              ? "Partial payment received"
              : "Payment not yet received",
      };
    } catch {
      return {
        verified: false,
        billId: input.billId,
        paymentStatus: "pending",
        message: "Network error while verifying payment",
      };
    }
  }

  async markAsPaid(
    billId: string,
    verifiedBy: string,
    transactionId?: string
  ): Promise<PaymentVerificationResult> {
    try {
      const updates: Record<string, unknown> = {
        paymentStatus: "paid",
        paidAmount: 0,
        balanceAmount: 0,
        paymentMethod: "upi",
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch(`/api/bills/${billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          _verification: {
            verifiedBy,
            verificationTime: new Date().toISOString(),
            transactionId: transactionId || null,
          },
        }),
      });

      if (!res.ok) {
        return {
          success: false,
          billId,
          status: "pending",
          message: "Failed to update bill status",
        };
      }

      return {
        success: true,
        billId,
        status: "paid",
        message: "Bill marked as paid successfully",
      };
    } catch {
      return {
        success: false,
        billId,
        status: "pending",
        message: "Network error while updating bill",
      };
    }
  }
}

export class PaymentService {
  private provider: PaymentProvider;

  constructor(provider?: PaymentProvider) {
    this.provider = provider ?? new ManualUpiProvider();
  }

  setProvider(provider: PaymentProvider): void {
    this.provider = provider;
  }

  getProvider(): PaymentProvider {
    return this.provider;
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    return this.provider.verify(input);
  }

  async markAsPaid(
    billId: string,
    verifiedBy: string,
    transactionId?: string
  ): Promise<PaymentVerificationResult> {
    return this.provider.markAsPaid(billId, verifiedBy, transactionId);
  }
}

export const paymentService = new PaymentService();
