"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, X, FileText, Tag, Eye, Star, StickyNote } from "lucide-react";
import type { InventoryFormData } from "@/hooks/use-multiple-inventory-form";
import type { ImageItem } from "@/components/inventory/product-image-upload";

interface MediaStepProps {
  formData: InventoryFormData;
  errors: Record<string, string>;
  onInputChange: (field: string, value: string) => void;
  onImagesChange: (images: ImageItem[]) => void;
}

export function MediaStep({ formData, errors, onInputChange, onImagesChange }: MediaStepProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const glassCardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  };

  const glassInputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(16px)",
    borderRadius: "12px",
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const remaining = 10 - (formData.images?.length || 0);
    const toAdd = Array.from(files).slice(0, remaining);
    const newImages: ImageItem[] = toAdd.map((file) => {
      const id = Math.random().toString(36).slice(2);
      return {
        id,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "local" as const,
      };
    });
    onImagesChange([...(formData.images || []), ...newImages]);
  }, [formData.images, onImagesChange]);

  const removeImage = useCallback((id: string) => {
    const img = (formData.images || []).find((i) => i.id === id);
    if (img?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(img.previewUrl);
    }
    onImagesChange((formData.images || []).filter((i) => i.id !== id));
  }, [formData.images, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  }, [handleFiles]);

  const images = formData.images || [];

  return (
    <div className="space-y-5">
      {/* Product Image */}
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <ImagePlus className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Product Image</h3>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className="relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-8"
          style={{
            borderColor: dragOver ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.1)",
            background: dragOver ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.03)",
          }}
        >
          <ImagePlus className="w-10 h-10 mb-2" style={{ color: "rgba(148,163,184,0.4)" }} />
          <p className="text-sm font-medium" style={{ color: "rgba(148,163,184,0.7)" }}>
            Drop images here or click to browse
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>
            Up to 10 images
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square rounded-xl overflow-hidden group"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <img
                  src={image.status === "uploaded" && image.uploadedUrl ? image.uploadedUrl : image.previewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {image.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  </div>
                )}
                {image.status === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <span className="text-xs text-red-300">Failed</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(image.id); }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.6)" }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description & Notes */}
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5" style={{ color: "rgba(139,92,246,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Description & Notes</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-slate-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onInputChange("description", e.target.value)}
              placeholder="Enter product description..."
              className="min-h-[80px]"
              style={glassInputStyle}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <StickyNote className="w-3.5 h-3.5" style={{ color: "rgba(148,163,184,0.5)" }} />
              <Label htmlFor="notes" className="text-sm text-slate-400">
                Notes <span className="text-[10px] text-slate-500">(Internal only)</span>
              </Label>
            </div>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => onInputChange("notes", e.target.value)}
              placeholder="Internal notes..."
              className="min-h-[60px]"
              style={glassInputStyle}
            />
          </div>
        </div>
      </div>

      {/* Tags & Toggles */}
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Tag className="w-5 h-5" style={{ color: "rgba(139,92,246,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Tags & Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm text-slate-300">
              Tags / Keywords
            </Label>
            <Input
              id="tags"
              value={formData.tags || ""}
              onChange={(e) => onInputChange("tags", e.target.value)}
              placeholder="e.g. premium, best-seller, new-arrival"
              style={glassInputStyle}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4" style={{ color: "rgba(148,163,184,0.6)" }} />
              <div>
                <Label htmlFor="visibility" className="text-sm text-slate-300 cursor-pointer">
                  Visible on Store
                </Label>
                <p className="text-xs text-slate-500">Show this product in the storefront</p>
              </div>
            </div>
            <Switch id="visibility" defaultChecked />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4" style={{ color: "rgba(148,163,184,0.6)" }} />
              <div>
                <Label htmlFor="featured" className="text-sm text-slate-300 cursor-pointer">
                  Featured Product
                </Label>
                <p className="text-xs text-slate-500">Highlight this product as featured</p>
              </div>
            </div>
            <Switch id="featured" />
          </div>
        </div>
      </div>
    </div>
  );
}
