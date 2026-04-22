import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'dark';
}

export function Input({
  label,
  error,
  variant = 'default',
  className = '',
  ...props
}: InputProps) {
  const variantClasses = {
    default:
      'bg-white text-black border-black placeholder-[#999999] focus:border-[#CCFF00]',
    dark: 'bg-[#1A1A1A] text-white border-[#333333] placeholder-[#999999] focus:border-[#CCFF00]',
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block font-bold uppercase text-white">
          {label}
        </label>
      )}
      <input
        className={`w-full border-2 px-4 py-3 font-bold outline-none transition-colors ${variantClasses[variant]} ${className}`}
        {...props}
      />
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
