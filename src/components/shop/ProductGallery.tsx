"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Package, X } from "lucide-react";
import { ShopImage } from "@/components/ui/shop-image";
import { getSanityImageUrl, getSanityImageUrlFull, getNextImageFallbackUrl } from "@/lib/shop-queries";
import type { ShopProduct } from "@/lib/shop-queries";

export function ProductGallery({ product }: { product: ShopProduct }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);

  const fullscreenUrls = useMemo(() => {
    return product.images?.map((img: any) => {
      const url = getSanityImageUrlFull(img);
      if (!url) return null;
      return {
        cdn: url,
        fallback: getNextImageFallbackUrl(url, 1200),
      };
    }).filter(Boolean) || [];
  }, [product.images]);
  const touchStartX = useRef(0);

  const imageUrls =
    product.images?.map((img: any) => getSanityImageUrl(img)).filter(Boolean) ||
    [];
  const videoUrl = product.videos?.[0]?.url || null;

  const next = useCallback(() => {
    if (imageUrls.length > 0) {
      setSelectedImage((i) => (i + 1) % imageUrls.length);
    }
  }, [imageUrls.length]);

  const prev = useCallback(() => {
    if (imageUrls.length > 0) {
      setSelectedImage((i) => (i - 1 + imageUrls.length) % imageUrls.length);
    }
  }, [imageUrls.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) prev();
      else next();
    }
  };

  return (
    <>
      {/* Main image / video */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          {videoUrl ? (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <video
                src={videoUrl}
                controls
                className="aspect-[4/3] w-full object-cover md:aspect-square"
                preload="metadata"
                poster={imageUrls[0] || undefined}
              />
            </motion.div>
          ) : imageUrls.length > 0 ? (
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              onClick={() =>
                fullscreenUrls[selectedImage] && setFullscreen(true)
              }
              className="cursor-zoom-in"
            >
              <ShopImage
                src={product.images?.[selectedImage]}
                alt={product.images?.[selectedImage]?.alt || product.name}
                className="aspect-[4/3] w-full object-cover md:aspect-square object-center"
                style={{ maxHeight: "260px" }}
                imgWidth={600}
              />
            </motion.div>
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center md:aspect-square">
              <Package className="h-16 w-16 text-white/10 md:h-20 md:w-20" />
            </div>
          )}
        </AnimatePresence>

        {/* Nav arrows */}
        {imageUrls.length > 1 && !videoUrl && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-white/70 backdrop-blur-sm transition-all hover:bg-black/70 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-white/70 backdrop-blur-sm transition-all hover:bg-black/70 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Video indicator */}
        {videoUrl && imageUrls.length > 0 && (
          <div className="absolute left-2 top-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-sm">
              <Play className="h-3 w-3" />
              Video available
            </span>
          </div>
        )}

        {/* Position indicator */}
        {imageUrls.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {imageUrls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedImage(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === selectedImage
                    ? "w-6 bg-sky-400"
                    : "w-1.5 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {imageUrls.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 md:mt-3 md:gap-2">
          {imageUrls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedImage(i)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all md:rounded-xl ${
                i === selectedImage
                  ? "border-sky-400/60 opacity-100"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <ShopImage
                src={product.images?.[i]}
                alt={`${product.name} ${i + 1}`}
                className="h-10 w-10 object-cover md:h-16 md:w-16"
                imgWidth={150}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen modal */}
      <AnimatePresence>
        {fullscreen && fullscreenUrls[selectedImage] && (
          <motion.div
            key="fullscreen-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreen(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
            <motion.img
              key={`${selectedImage}-${fullscreenError ? "fallback" : "primary"}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={fullscreenError ? fullscreenUrls[selectedImage]!.fallback : fullscreenUrls[selectedImage]!.cdn}
              alt={product.name}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onError={() => { if (!fullscreenError) setFullscreenError(true); }}
            />
            {imageUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close button rendered outside overlay to avoid stacking-context nesting */}
      <AnimatePresence>
        {fullscreen && fullscreenUrls[selectedImage] && (
          <motion.button
            key="fullscreen-close"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreen(false)}
            className="fixed right-4 top-4 z-[210] flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
