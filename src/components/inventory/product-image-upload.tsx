"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ImagePlus, X, Loader2, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  status: "local" | "uploading" | "uploaded" | "error";
}

interface ProductImageUploadProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ProductImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false,
}: ProductImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const remaining = maxImages - images.length;
      const toAdd = files.slice(0, remaining);

      const newImages: ImageItem[] = toAdd.map((file) => ({
        id: Math.random().toString(36).slice(2),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "local" as const,
      }));

      onImagesChange([...images, ...newImages]);

      if (e.target) {
        e.target.value = "";
      }
    },
    [images, maxImages, onImagesChange]
  );

  const removeImage = useCallback(
    (id: string) => {
      const img = images.find((i) => i.id === id);
      if (img?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(img.previewUrl);
      }
      onImagesChange(images.filter((i) => i.id !== id));
    },
    [images, onImagesChange]
  );

  useEffect(() => {
    const currentPreviews = images.map((i) => i.previewUrl);
    return () => {
      currentPreviews.forEach((url) => {
        if (url?.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">
          Product Images
        </span>
        {images.length > 0 && (
          <span className="text-xs text-gray-500">
            {images.length}/{maxImages}
          </span>
        )}
      </div>

      {images.length === 0 && !disabled && (
        <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-gray-600 cursor-pointer hover:border-gray-400 transition-colors bg-gray-800/50">
          <ImagePlus className="w-8 h-8 text-gray-400 mb-1" />
          <span className="text-sm text-gray-400">
            Click to add images
          </span>
          <span className="text-xs text-gray-500 mt-0.5">
            Up to {maxImages} images
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelect}
            className="hidden"
            disabled={disabled}
          />
        </label>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-800 group"
            >
              {/* Image preview or skeleton */}
              {(image.status === "local" || image.status === "uploaded") && (
                <img
                  src={image.status === "uploaded" && image.uploadedUrl ? image.uploadedUrl : image.previewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {image.status === "uploading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-800">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-blue-400 animate-spin" />
                  <span className="text-xs text-gray-500">Uploading...</span>
                </div>
              )}

              {image.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-800">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <span className="text-xs text-red-400">Failed</span>
                </div>
              )}

              {/* Status badge */}
              {image.status === "uploaded" && (
                <div className="absolute top-1 left-1 p-0.5 bg-green-500/80 rounded-full">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Remove button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {images.length < maxImages && !disabled && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-gray-400 transition-colors bg-gray-800/30">
              <ImagePlus className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-500">Add</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelect}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
