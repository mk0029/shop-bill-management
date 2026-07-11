import QRCode from "qrcode";
import { generatePaymentReference } from "@/lib/payment-reference";

export interface UpiPaymentParams {
  pa: string;
  pn: string;
  am: string | number;
  tn: string;
  cu?: string;
  mode?: string;
}

export interface UpiApp {
  id: string;
  name: string;
  icon: string;
  color: string;
  textColor: string;
  getDeepLink: (params: UpiPaymentParams) => string;
}

export function generateUpiUri(params: UpiPaymentParams): string {
  const { pa, pn, am, tn, cu = "INR", mode = "04" } = params;
  const uri =
    `upi://pay?pa=${encodeURIComponent(pa)}` +
    `&pn=${encodeURIComponent(pn)}` +
    `&am=${encodeURIComponent(String(am))}` +
    `&tn=${encodeURIComponent(tn)}` +
    `&cu=${encodeURIComponent(cu)}` +
    `&mode=${encodeURIComponent(mode)}`;
  return uri;
}

export function generateQrDataUrl(
  upiUri: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    width: options?.width ?? 300,
    margin: options?.margin ?? 2,
    color: { dark: "#000", light: "#fff" },
  });
}

export function validateUpiId(upiId: string): boolean {
  if (!upiId || typeof upiId !== "string") return false;
  const upiRegex = /^[\w.\-_]{2,}@[\w.\-_]{2,}$/;
  return upiRegex.test(upiId.trim());
}

export function safeParseAmount(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && !isNaN(value))
    return Math.round(value * 100) / 100;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }
  return 0;
}

export function validateAmount(amount: number): boolean {
  return (
    typeof amount === "number" && !isNaN(amount) && amount > 0 && amount <= 99999999
  );
}

export function formatIndianRupee(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateBillReference(_billNumber: string, billId?: string): string {
  return generatePaymentReference(billId || _billNumber)
}

export function getUpiApps(): UpiApp[] {
  const apps: UpiApp[] = [
    {
      id: "google-pay",
      name: "Google Pay",
      icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#4285F4"/><path d="M16 20h4v8h-4zm6-4h4v12h-4zm6 6h4v6h-4z" fill="#fff"/><path d="M16 28c0 2.2 1.8 4 4 4h8v-4H20v-4h-4v4z" fill="#34A853"/></svg>`,
      color: "#4285F4",
      textColor: "#FFFFFF",
      getDeepLink: (params) => {
        const mode = params.mode || "04";
        return `tez://upi/pay?pa=${encodeURIComponent(params.pa)}&pn=${encodeURIComponent(params.pn)}&am=${encodeURIComponent(String(params.am))}&tn=${encodeURIComponent(params.tn)}&cu=INR&mode=${encodeURIComponent(mode)}`;
      },
    },
    {
      id: "phonepe",
      name: "PhonePe",
      icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#5F259F"/><path d="M24 10l12 7v14l-12 7-12-7V17l12-7z" fill="#fff" opacity="0.9"/><path d="M24 14l8 4.5v9l-8 4.5-8-4.5v-9l8-4.5z" fill="#9B51E0"/></svg>`,
      color: "#5F259F",
      textColor: "#FFFFFF",
      getDeepLink: (params) => {
        const mode = params.mode || "04";
        return `phonepe://pay?pa=${encodeURIComponent(params.pa)}&pn=${encodeURIComponent(params.pn)}&am=${encodeURIComponent(String(params.am))}&tn=${encodeURIComponent(params.tn)}&cu=INR&mode=${encodeURIComponent(mode)}`;
      },
    },
    {
      id: "paytm",
      name: "Paytm",
      icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#00BAF2"/><path d="M14 14h20v20H14V14z" fill="#fff"/><path d="M18 22c0-3.3 2.7-6 6-6s6 2.7 6 6v4h-4v-4c0-1.1-.9-2-2-2s-2 .9-2 2v4h-4v-4z" fill="#00BAF2"/></svg>`,
      color: "#00BAF2",
      textColor: "#FFFFFF",
      getDeepLink: (params) => {
        return generateUpiUri(params);
      },
    },
    {
      id: "bhim",
      name: "BHIM",
      icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#108D3E"/><path d="M14 14h20v20H14V14z" fill="#fff"/><text x="24" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#108D3E">BHIM</text></svg>`,
      color: "#108D3E",
      textColor: "#FFFFFF",
      getDeepLink: (params) => {
        return generateUpiUri(params);
      },
    },
    {
      id: "amazon-pay",
      name: "Amazon Pay",
      icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#FF9900"/><path d="M14 18c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v12c0 2.2-1.8 4-4 4H18c-2.2 0-4-1.8-4-4V18z" fill="#fff"/><path d="M22 20h4l-2 6h-4l-2-6h4l1 3 1-3z" fill="#FF9900"/></svg>`,
      color: "#FF9900",
      textColor: "#FFFFFF",
      getDeepLink: (params) => {
        const mode = params.mode || "04";
        return `amazonpay://upi/pay?pa=${encodeURIComponent(params.pa)}&pn=${encodeURIComponent(params.pn)}&am=${encodeURIComponent(String(params.am))}&tn=${encodeURIComponent(params.tn)}&cu=INR&mode=${encodeURIComponent(mode)}`;
      },
    },
  ];
  return apps;
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function launchUpiApp(app: UpiApp, params: UpiPaymentParams): void {
  const deepLink = app.getDeepLink(params);
  window.location.href = deepLink;
}

export function launchUpiWithChooser(params: UpiPaymentParams): void {
  const uri = generateUpiUri(params);
  window.location.href = uri;
}
