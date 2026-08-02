import { useMemo, useState, ReactNode, ImgHTMLAttributes } from 'react';

interface SanityImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: unknown;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  width?: number;
  height?: number;
  fill?: boolean;
}

function sanityAssetRefToUrl(ref: string) {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "";
  if (!projectId || !dataset || !ref.startsWith("image-")) return "";
  const parts = ref.replace(/^image-/, "").split("-");
  const format = parts.pop();
  const dimensions = parts.pop();
  const id = parts.join("-");
  if (!id || !dimensions || !format) return "";
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`;
}

function normalizeImageSrc(src: unknown) {
  if (!src) return "";
  if (typeof src === "string") return src;
  if (typeof src !== "object") return "";
  const value = src as {
    url?: unknown;
    asset?: { url?: unknown; _ref?: unknown };
    _ref?: unknown;
  };
  if (typeof value.url === "string") return value.url;
  if (typeof value.asset?.url === "string") return value.asset.url;
  if (typeof value.asset?._ref === "string") return sanityAssetRefToUrl(value.asset._ref);
  if (typeof value._ref === "string") return sanityAssetRefToUrl(value._ref);
  return "";
}

export function SanityImage({
  src,
  alt,
  className = '',
  fallback,
  fill,
  width,
  height,
  style,
  ...props
}: SanityImageProps) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = useMemo(() => {
    const normalizedSrc = normalizeImageSrc(src);
    if (!normalizedSrc) return null;
    if (normalizedSrc.startsWith('http') || normalizedSrc.startsWith('data:')) {
      return normalizedSrc;
    }
    const sanityAssetUrl = sanityAssetRefToUrl(normalizedSrc);
    if (sanityAssetUrl) return sanityAssetUrl;
    const baseUrl = process.env.NEXT_PUBLIC_SANITY_URL || '';
    return normalizedSrc.startsWith('/') ? `${baseUrl}${normalizedSrc}` : `${baseUrl}/${normalizedSrc}`;
  }, [src]);

  if (!imageUrl || hasError) {
    return fallback ? (
      <div className={`flex items-center justify-center ${className}`}>
        {fallback}
      </div>
    ) : null;
  }

  const imgStyle: React.CSSProperties = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...(style || {}) }
    : { ...(style || {}) };

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      width={width}
      height={height}
      style={imgStyle}
      onError={() => setHasError(true)}
      loading="lazy"
      {...props}
    />
  );
}
