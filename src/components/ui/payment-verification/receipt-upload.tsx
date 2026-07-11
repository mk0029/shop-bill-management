"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Smartphone,
  Scan,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { extractTextFromImage, compressImage } from "@/lib/payment-verification/browser-ocr";

interface OcrProgressState {
  status: "idle" | "ocr" | "verifying" | "done" | "error";
  progress: number;
  message: string;
}

interface ReceiptUploadProps {
  billId?: string;
  billNumber: string;
  billReference: string;
  onVerificationResult?: (result: {
    success: boolean;
    payment?: any;
    match?: any;
    error?: string;
  }) => void;
}

export function ReceiptUpload({
  billId,
  billNumber,
  billReference,
  onVerificationResult,
}: ReceiptUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgressState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [result, setResult] = useState<{
    success: boolean;
    payment?: any;
    match?: any;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File | null) => {
    setError(null);
    setResult(null);
    setOcrProgress({ status: "idle", progress: 0, message: "" });
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Please select a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large. Maximum size is 10MB.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !previewUrl) return;

    setError(null);
    setResult(null);

    try {
      setOcrProgress({ status: "ocr", progress: 0, message: "Preparing image..." });

      const compressed = await compressImage(previewUrl, 2048, 0.8);
      const base64 = compressed.split(",")[1];

      setOcrProgress({ status: "ocr", progress: 0, message: "Reading receipt..." });

      const { text: ocrText } = await extractTextFromImage(compressed, (p) => {
        setOcrProgress({
          status: "ocr",
          progress: p.progress,
          message: p.message,
        });
      });

      if (!ocrText.trim()) {
        setError("No text could be extracted from this receipt. Please upload a clearer image.");
        setOcrProgress({ status: "idle", progress: 0, message: "" });
        return;
      }

      setOcrProgress({ status: "verifying", progress: 1, message: "Verifying payment..." });

      const res = await fetch("/api/payments/verify-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          ocrText,
          billId,
        }),
      });

      const data = await res.json();
      setResult(data);
      setOcrProgress({ status: "done", progress: 1, message: "" });
      onVerificationResult?.(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to process receipt";
      setError(msg);
      setOcrProgress({ status: "error", progress: 0, message: msg });
    }
  }, [selectedFile, previewUrl, billId, onVerificationResult]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setOcrProgress({ status: "idle", progress: 0, message: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const isProcessing = ocrProgress.status === "ocr" || ocrProgress.status === "verifying";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Smartphone className="w-3.5 h-3.5" />
        Upload Payment Receipt
      </h3>

      <AnimatePresence mode="wait">
        {!previewUrl && !result && ocrProgress.status === "idle" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700/50 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm text-gray-300 mb-1">
                Tap to upload your UPI receipt
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG, or WEBP &middot; Max 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          </motion.div>
        )}

        {(previewUrl || isProcessing) && !result && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="relative rounded-xl overflow-hidden bg-black/40">
              <img
                src={previewUrl || ""}
                alt="Receipt preview"
                className="w-full max-h-48 object-contain"
              />
              {!isProcessing && (
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>

            {!isProcessing && (
              <>
                <p className="text-xs text-gray-500 text-center">
                  {selectedFile?.name} ({(selectedFile!.size / 1024).toFixed(1)} KB)
                </p>
                <button
                  onClick={handleUpload}
                  className={cn(
                    "w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]",
                    "bg-gradient-to-r from-purple-600 to-blue-600 text-white",
                    "hover:from-purple-500 hover:to-blue-500",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <Upload className="w-4 h-4" />
                  Upload & Verify Receipt
                </button>
              </>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  {ocrProgress.status === "ocr" ? (
                    <Scan className="w-4 h-4 text-purple-400 animate-pulse" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  <span>{ocrProgress.message}</span>
                </div>
                {ocrProgress.status === "ocr" && (
                  <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(ocrProgress.progress * 100, 5)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {result.success ? (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-green-300">
                    Payment Verified
                  </span>
                </div>
                {result.match && (
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>
                      Amount: ₹{result.match.paidAmount} of ₹
                      {result.match.billAmount}
                    </p>
                    <p>Status: {result.match.matchType.replace(/_/g, " ")}</p>
                    <p className="text-gray-500">{result.match.message}</p>
                  </div>
                )}
                <button
                  onClick={handleReset}
                  className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Upload another receipt
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-medium text-red-300">
                    Verification Failed
                  </span>
                </div>
                <p className="text-xs text-red-300/80">
                  {result.error || "Could not verify this receipt."}
                </p>
                <button
                  onClick={handleReset}
                  className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && !isProcessing && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
