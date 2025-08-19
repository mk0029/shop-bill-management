import Image, { ImageProps } from 'next/image';
import { useMemo, useState, ReactNode } from 'react';

interface SanityImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: ReactNode;
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
    if (!src) return null;
    
    // If it's already a full URL or data URL, return as is
    if (src.startsWith('http') || src.startsWith('data:')) {
      return src;
    }
    
    // Prepend Sanity URL if it's a relative path
    const baseUrl = process.env.NEXT_PUBLIC_SANITY_URL || '';
    return src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
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
