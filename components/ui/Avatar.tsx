import Image from 'next/image';
import { HTMLAttributes } from 'react';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  initials?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const sizeText = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
};

export function Avatar({
  src,
  alt,
  size = 'md',
  initials,
  className = '',
  ...props
}: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <div
        className={`${sizeClass} relative overflow-hidden rounded border-2 border-[#333333] ${className}`}
        {...props}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded border-2 border-[#CCFF00] bg-[#1A1A1A] ${sizeText[size]} font-bold text-[#CCFF00] ${className}`}
      {...props}
    >
      {initials || '?'}
    </div>
  );
}
