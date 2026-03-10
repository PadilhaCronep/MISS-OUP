import React from 'react';

interface ErrorStateProps {
  mensagem: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ mensagem, onRetry, compact = false }) => {
  return (
    <div className={`w-full rounded-2xl border border-red-200 bg-red-50 ${compact ? 'p-4' : 'p-8'} text-center`}>
      <h2 className={`font-bold text-red-700 ${compact ? 'text-base mb-1' : 'text-xl mb-2'}`}>
        Ocorreu um erro
      </h2>
      <p className="text-red-600 text-sm">{mensagem}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-4 bg-[#F5C400] text-zinc-900 px-5 py-2 rounded-xl font-bold hover:bg-[#e0b300] transition-colors"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
};
