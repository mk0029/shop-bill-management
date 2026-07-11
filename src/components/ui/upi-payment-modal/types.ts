export interface BillData {
  _id?: string;
  billId?: string;
  billNumber: string;
  totalAmount: unknown;
  balanceAmount?: unknown;
  paidAmount?: unknown;
  customerName?: string;
  customerPhone?: string;
  billDate?: string;
  dueDate?: string;
}

export interface QrValidation {
  valid: boolean;
  errors: string[];
}
