import Image, { ImageProps } from 'next/image';
import { useMemo, useState, ReactNode } from 'react';

interface SanityImageProps extends Omit<ImageProps, 'src'> {
  src: unknown;
  alt: string;
  className?: string;
  fallback?: ReactNode;
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
  ...props
}: SanityImageProps) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = useMemo(() => {
    const normalizedSrc = normalizeImageSrc(src);
    if (!normalizedSrc) return null;
    
    // If it's already a full URL or data URL, return as is
    if (normalizedSrc.startsWith('http') || normalizedSrc.startsWith('data:')) {
      return normalizedSrc;
    }

    const sanityAssetUrl = sanityAssetRefToUrl(normalizedSrc);
    if (sanityAssetUrl) return sanityAssetUrl;
    
    // Prepend Sanity URL if it's a relative path
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

  return (
    <Image
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

// Usage example:
// <SanityImage 
//   src={user?.profileImage} 
//   alt={user?.name || 'Profile'} 
//   width={40} 
//   height={40}
//   className="rounded-full object-cover"
//   fallback={<User className="w-5 h-5 text-white" />}
// />
