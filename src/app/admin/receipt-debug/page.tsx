import { ReceiptDebugger } from "@/components/ui/payment-verification/receipt-debugger";

export const metadata = {
  title: "Receipt OCR Debugger | Admin",
};

export default function ReceiptDebugPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Receipt OCR Debugger</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a receipt to see exactly what Tesseract.js extracts and how the
          backend parses it. No payment records are created.
        </p>
      </div>
      <ReceiptDebugger />
    </div>
  );
}
