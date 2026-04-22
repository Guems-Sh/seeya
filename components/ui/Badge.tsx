import { ReactNode, HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  const baseClasses =
    'inline-block font-bold border rounded-full border-2';

  const variantClasses = {
    primary: 'bg-[#CCFF00] text-black border-[#CCFF00]',
    secondary: 'bg-[#1A1A1A] text-[#CCFF00] border-[#CCFF00]',
    outline: 'bg-transparent text-white border-[#333333]',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
