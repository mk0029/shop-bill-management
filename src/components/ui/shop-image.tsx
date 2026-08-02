"use client";

import { useState, useMemo, type ReactNode, type ImgHTMLAttributes } from "react";
import { getSanityImageUrl, getNextImageFallbackUrl } from "@/lib/shop-queries";

interface ShopImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: unknown;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  width?: number;
  height?: number;
  fill?: boolean;
  imgWidth?: number;
  imgQuality?: number;
}

export function ShopImage({
  src,
  alt,
  className = "",
  fallback,
  fill,
  width,
  height,
  imgWidth = 600,
  imgQuality = 75,
  style,
  ...props
}: ShopImageProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  const urls = useMemo(() => {
    const cdnUrl = typeof src === "string" && src.startsWith("http") ? src : getSanityImageUrl(src);
    if (!cdnUrl) return { primary: null, secondary: null };
    return {
      primary: cdnUrl,
      secondary: getNextImageFallbackUrl(cdnUrl, imgWidth, imgQuality),
    };
  }, [src, imgWidth, imgQuality]);

  if (!urls.primary || fallbackFailed) {
    return fallback ? (
      <div className={`flex items-center justify-center ${className}`}>
        {fallback}
      </div>
    ) : null;
  }

  const currentSrc = useFallback && urls.secondary ? urls.secondary : urls.primary;

  const imgStyle: React.CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...(style || {}) }
    : { ...(style || {}) };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      style={imgStyle}
      loading="lazy"
      onError={() => {
        if (!useFallback && urls.secondary) {
          setUseFallback(true);
        } else {
          setFallbackFailed(true);
        }
      }}
      {...props}
    />
  );
}
