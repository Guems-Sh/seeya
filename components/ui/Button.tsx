import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses =
    'font-bold border-2 rounded transition-colors uppercase tracking-wider';

  const variantClasses = {
    primary:
      'bg-[#CCFF00] text-black border-[#CCFF00] hover:bg-black hover:text-[#CCFF00]',
    secondary:
      'bg-[#1A1A1A] text-[#CCFF00] border-[#CCFF00] hover:bg-[#CCFF00] hover:text-black',
    outline:
      'bg-transparent text-white border-[#333333] hover:border-[#CCFF00] hover:text-[#CCFF00]',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
