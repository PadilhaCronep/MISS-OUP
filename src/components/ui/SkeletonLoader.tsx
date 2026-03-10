import React from 'react';

interface SkeletonLoaderProps {
  variant: 'card' | 'table-row' | 'kpi' | 'profile' | 'list-item';
  count?: number;
  className?: string;
}

const variantMap: Record<SkeletonLoaderProps['variant'], string> = {
  card: 'h-40 w-full',
  'table-row': 'h-12 w-full',
  kpi: 'h-28 w-full',
  profile: 'h-64 w-full',
  'list-item': 'h-16 w-full',
};

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ variant, count = 1, className = '' }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${variant}-${index}`}
          className={`animate-pulse rounded-lg bg-white/10 ${variantMap[variant]} ${className}`}
        />
      ))}
    </>
  );
};
