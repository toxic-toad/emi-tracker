import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-800 rounded',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
      <Skeleton className="h-4 w-1/2 mb-3" />
      <Skeleton className="h-8 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
