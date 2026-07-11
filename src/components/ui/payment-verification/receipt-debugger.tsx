"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Loader2,
  Scan,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Hash,
  IndianRupee,
  Search,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { extractTextFromImage, compressImage } from "@/lib/payment-verification/browser-ocr";

type Stage = "idle" | "ocr" | "parsing" | "done" | "error";

interface ParseResult {
  success: boolean;
  extractedData?: {
    normalizedText: string;
    rawText: string;
    amount: number | null;
    billReference: string | null;
    utr: string | null;
    transactionId: string | null;
    merchantName: string | null;
    merchantUpi: string | null;
    bankName: string | null;
    paymentDate: string | null;
    paymentTime: string | null;
    status: string | null;
  };
  validation?: {
    valid: boolean;
    autoVerifiable: boolean;
    errors: string[];
    warnings: string[];
    requiresManualReview: boolean;
  };
  bill?: {
    _id: string;
    billNumber: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    discount: number;
    paymentStatus: string;
    customer?: { name: string; phone: string };
  } | null;
  amountMatch?: {
    matchType: string;
    billAmount: number;
    paidAmount: number;
    difference: number;
    message: string;
  } | null;
  error?: string;
  processingLog?: any;
}

function Section({ title, icon: Icon, children, className }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <Icon className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, value, highlight, sub }: { label: string; value: string | number | null; highlight?: boolean; sub?: string }) {
  const display = value ?? <span className="text-gray-600 italic">Not found</span>;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="flex items-center gap-2">
        {sub && <span className="text-[10px] text-gray-600 font-mono">{sub}</span>}
        <span className={cn("text-xs font-mono", highlight ? "text-green-400" : value ? "text-gray-200" : "text-gray-600")}>
          {display}
        </span>
      </span>
    </div>
  );
}

export function ReceiptDebugger() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [ocrWords, setOcrWords] = useState<any[] | null>(null);
  const [correctedCount, setCorrectedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | null) => {
    setError(null);
      setResult(null);
    setRawOcrText(null);
    setOcrWords(null);
    setCorrectedCount(0);
    setStage("idle");

    if (!file) { setPreviewUrl(null); return }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setError("Please select a JPG, PNG, or WEBP image."); return }
    if (file.size > 10 * 1024 * 1024) { setError("Image too large. Max 10MB."); return }

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] || null);
  }, [handleFile]);

  const handleAnalyze = useCallback(async () => {
    if (!previewUrl) return;
    setError(null);
    setResult(null);
    setRawOcrText(null);

    try {
      setStage("ocr");
      setProgress(0);
      setMessage("Processing image...");

      const compressed = await compressImage(previewUrl, 2048, 0.8);

      setMessage("Reading receipt with OCR...");
      const ocrResult = await extractTextFromImage(compressed, (p) => {
        setProgress(p.progress);
        setMessage(p.message);
      });

      setRawOcrText(ocrResult.rawText);
      setOcrWords(ocrResult.words || []);
      setCorrectedCount(ocrResult.correctedCount || 0);

      if (!ocrResult.text.trim()) {
        setError("No text could be extracted. Try a clearer image.");
        setStage("idle");
        return;
      }

      setStage("parsing");
      setProgress(0.5);
      setMessage("Parsing receipt data...");

      const res = await fetch("/api/payments/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText: ocrResult.text }),
      });

      const data: ParseResult = await res.json();
      setResult(data);
      setStage("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to analyze receipt";
      setError(msg);
      setStage("error");
    }
  }, [previewUrl]);

  const handleReset = useCallback(() => {
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setRawOcrText(null);
    setStage("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const isProcessing = stage === "ocr" || stage === "parsing";

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
          <Scan className="w-4 h-4 text-purple-400" />
          Receipt OCR Debugger
        </h2>

        {!previewUrl && stage === "idle" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700/50 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-7 h-7 text-purple-400" />
            </div>
            <p className="text-sm text-gray-300 mb-1">Upload a receipt screenshot to debug</p>
            <p className="text-xs text-gray-500">JPG, PNG, WEBP &middot; Max 10MB</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFile(e.target.files?.[0] || null)} className="hidden" />
          </div>
        )}

        {(previewUrl || isProcessing) && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black/40">
              <img src={previewUrl || ""} alt="Receipt" className="w-full max-h-48 object-contain" />
              {!isProcessing && (
                <button onClick={handleReset} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all">
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>

            {!isProcessing && !result && (
              <button onClick={handleAnalyze} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                <Search className="w-4 h-4" />
                Analyze Receipt
              </button>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  {stage === "ocr" ? (
                    <Scan className="w-4 h-4 text-purple-400 animate-pulse" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  <span>{message}</span>
                </div>
                {stage === "ocr" && (
                  <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.max(progress * 100, 5)}%` }} transition={{ duration: 0.3 }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && !isProcessing && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-red-400">
            {error}
          </motion.p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Status banner */}
          <div className={cn("rounded-xl border p-4 flex items-start gap-3", result.success
            ? "bg-green-500/10 border-green-500/20"
            : "bg-red-500/10 border-red-500/20")}>
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={cn("text-sm font-medium", result.success ? "text-green-300" : "text-red-300")}>
                {result.success ? "Receipt parsed successfully" : "Parse failed"}
              </p>
              {result.error && <p className="text-xs text-red-300/80 mt-0.5">{result.error}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Raw OCR Text */}
            <Section title="Raw OCR Text" icon={FileText}>
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {rawOcrText || "No raw text"}
              </pre>
            </Section>

            {/* Normalized OCR Text */}
            <Section title="Normalized OCR Text" icon={FileText}>
              {correctedCount > 0 && (
                <div className="mb-2 text-[10px] font-medium text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded inline-block">
                  {correctedCount} ₹ misprint{correctedCount > 1 ? "s" : ""} corrected
                </div>
              )}
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {result.extractedData?.normalizedText || "No normalized text"}
              </pre>
            </Section>
          </div>

          {/* OCR Word Details */}
          {ocrWords && ocrWords.length > 0 && (
            <Section title={correctedCount > 0 ? "OCR Words (with corrections)" : "OCR Words"} icon={FileText}>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                <div className="grid grid-cols-[1fr_1fr_80px_60px] gap-2 text-[10px] text-gray-600 font-mono pb-1 border-b border-white/[0.04] mb-1">
                  <span>Word</span>
                  <span>Corrected</span>
                  <span>Confidence</span>
                  <span>Fix?</span>
                </div>
                {ocrWords.map((w: any, i: number) => (
                  <div key={i} className={cn("grid grid-cols-[1fr_1fr_80px_60px] gap-2 text-[10px] font-mono", w.isRupeeMisprint ? "text-yellow-300" : "text-gray-500")}>
                    <span className="truncate">{w.text || ""}</span>
                    <span className="truncate">{w.corrected !== w.text ? w.corrected : "—"}</span>
                    <span>{w.confidence ? `${Math.round(w.confidence)}%` : "—"}</span>
                    <span>{w.isRupeeMisprint ? "✓" : ""}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Provider Info */}
          {result.extractedData?.provider && (
            <Section title="Provider" icon={result.extractedData.provider === "UNKNOWN" ? AlertTriangle : CheckCircle2}>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-semibold", result.extractedData.provider !== "UNKNOWN" ? "text-purple-300" : "text-yellow-300")}>
                  {result.extractedData.provider}
                </span>
                {result.extractedData.providerConfidence && (
                  <span className="text-[10px] text-gray-500">({result.extractedData.providerConfidence}% confidence)</span>
                )}
                {result.extractedData.parserUsed && (
                  <span className="text-[10px] text-gray-600 ml-auto">Parser: {result.extractedData.parserUsed}</span>
                )}
              </div>
            </Section>
          )}

          {/* Extracted Fields */}
          <Section title="Extracted Fields" icon={Hash}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <Field label="Amount" value={result.extractedData?.amount ? `₹${result.extractedData.amount}` : null} highlight={!!result.extractedData?.amount} sub={result.extractedData?.amountConfidence ? `${result.extractedData.amountConfidence}%` : ""} />
              <Field label="Bill Reference" value={result.extractedData?.billReference} highlight={!!result.extractedData?.billReference} sub={result.extractedData?.billReferenceConfidence ? `${result.extractedData.billReferenceConfidence}%` : ""} />
              <Field label="Transaction Ref" value={result.extractedData?.transactionReference} highlight={!!result.extractedData?.transactionReference} sub={result.extractedData?.transactionReferenceConfidence ? `${result.extractedData.transactionReferenceConfidence}%` : ""} />
              <Field label="Status" value={result.extractedData?.status} highlight={result.extractedData?.status === "SUCCESS"} sub={result.extractedData?.statusConfidence ? `${result.extractedData.statusConfidence}%` : ""} />
              <Field label="Merchant Name" value={result.extractedData?.merchantName} highlight={!!result.extractedData?.merchantName} />
              <Field label="Merchant UPI" value={result.extractedData?.merchantUpi} highlight={!!result.extractedData?.merchantUpi} />
              <Field label="Bank" value={result.extractedData?.bankName} />
              <Field label="Date" value={result.extractedData?.paymentDate} />
              <Field label="Time" value={result.extractedData?.paymentTime} />
            </div>
            {result.extractedData?.amountDebug && (
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <p className="text-[10px] text-gray-600 font-mono">{result.extractedData.amountDebug}</p>
              </div>
            )}
            {result.extractedData?.amountCandidates && result.extractedData.amountCandidates.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-500 mb-1">Amount candidates ({result.extractedData.amountCandidates.length}):</p>
                <div className="space-y-0.5">
                  {result.extractedData.amountCandidates.map((c: any, i: number) => (
                    <p key={i} className="text-[10px] font-mono text-gray-500">
                      #{i + 1}: "{c.raw}" = ₹{c.value} (score: {c.score})
                    </p>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Validation */}
          {result.validation && (
            <Section title="Validation" icon={result.validation.valid ? CheckCircle2 : AlertTriangle} className={cn(result.validation.valid ? "" : "border-yellow-500/20")}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", result.validation.valid ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300")}>
                  {result.validation.valid ? "Valid" : "Issues found"}
                </span>
                {result.validation.autoVerifiable && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    Auto-verifiable
                  </span>
                )}
              </div>
              {result.validation.errors.length > 0 && (
                <div className="space-y-1 mb-2">
                  <p className="text-xs text-red-400 font-medium">Errors:</p>
                  {result.validation.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-300/80 flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{e}</span>
                    </p>
                  ))}
                </div>
              )}
              {result.validation.warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-yellow-400 font-medium">Warnings:</p>
                  {result.validation.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-300/80 flex items-start gap-1.5">
                      <span className="text-yellow-400 mt-0.5">•</span>
                      <span>{w}</span>
                    </p>
                  ))}
                </div>
              )}
              {result.validation.errors.length === 0 && result.validation.warnings.length === 0 && (
                <p className="text-xs text-green-400/80">All validation checks passed.</p>
              )}
            </Section>
          )}

          {/* Matched Bill */}
          {result.bill && (
            <Section title="Matched Bill" icon={Search}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Bill Number" value={result.bill.billNumber} highlight />
                <Field label="Total Amount" value={`₹${result.bill.totalAmount}`} />
                <Field label="Already Paid" value={`₹${result.bill.paidAmount}`} />
                <Field label="Balance" value={`₹${result.bill.balanceAmount}`} />
                <Field label="Discount" value={`₹${result.bill.discount}`} />
                <Field label="Payment Status" value={result.bill.paymentStatus} />
                <Field label="Customer" value={result.bill.customer ? `${result.bill.customer.name} (${result.bill.customer.phone})` : "N/A"} />
              </div>
            </Section>
          )}

          {!result.bill && result.extractedData?.billReference && (
            <Section title="Bill Lookup" icon={Search}>
              <p className="text-xs text-yellow-300/80 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>No bill found for reference &quot;{result.extractedData.billReference}&quot;</span>
              </p>
            </Section>
          )}

          {/* Amount Match */}
          {result.amountMatch && (
            <Section title="Amount Match" icon={IndianRupee}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Match Type" value={result.amountMatch.matchType.replace(/_/g, " ")} highlight />
                <Field label="Bill Amount" value={`₹${result.amountMatch.billAmount}`} />
                <Field label="Paid Amount" value={`₹${result.amountMatch.paidAmount}`} />
                <Field label="Difference" value={`₹${result.amountMatch.difference}`} />
              </div>
              <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-white/[0.04]">
                {result.amountMatch.message}
              </p>
            </Section>
          )}

          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] transition-all active:scale-[0.98]"
          >
            Analyze another receipt
          </button>
        </div>
      )}
    </div>
  );
}
