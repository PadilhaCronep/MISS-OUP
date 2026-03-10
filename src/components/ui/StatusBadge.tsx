import React from 'react';

const variants = {
  ativo: 'bg-green-900/50 text-green-400 border border-green-800',
  inativo: 'bg-gray-900/50 text-gray-400 border border-gray-700',
  pendente: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
  urgente: 'bg-red-900/50 text-red-400 border border-red-800',
  concluido: 'bg-blue-900/50 text-blue-400 border border-blue-800',
} as const;

type StatusVariant = keyof typeof variants;

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider ${variants[status]} ${className}`}>
      {label ?? status}
    </span>
  );
};
