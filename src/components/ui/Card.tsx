import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  gradient?: boolean;
}

export function Card({ children, className, onClick, gradient = false }: CardProps) {
  const baseStyles = 'rounded-2xl p-4 backdrop-blur-sm transition-all duration-200';
  const gradientStyles = gradient 
    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700'
    : 'bg-slate-800/50 border border-slate-700/50';

  const Component = onClick ? motion.div : 'div';
  const motionProps = onClick ? {
    whileHover: { scale: 1.02, y: -2 },
    whileTap: { scale: 0.98 },
    onClick
  } : {};

  return (
    <Component
      className={cn(baseStyles, gradientStyles, className)}
      {...motionProps}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-3', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-lg font-semibold text-white', className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-slate-300', className)}>{children}</div>;
}
