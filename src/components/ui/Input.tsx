import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
}

export function Input({ label, error, icon, className, multiline, rows, ...props }: InputProps) {
  const inputClasses = cn(
    'w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
    'transition-all duration-200',
    icon && 'pl-10',
    error && 'border-red-500 focus:ring-red-500/50',
    className
  );

  if (multiline) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        )}
        <textarea
          className={cn(inputClasses, 'resize-none min-h-[80px]')}
          rows={rows || 3}
          {...(props as any)}
        />
        {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={inputClasses}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

export function Select({
  label,
  error,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      )}
      <select
        className={cn(
          'w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
          'transition-all duration-200',
          error && 'border-red-500 focus:ring-red-500/50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
