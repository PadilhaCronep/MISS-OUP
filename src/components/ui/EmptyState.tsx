import React, { type ReactNode } from 'react';

interface EmptyStateProps {
  icone: ReactNode;
  titulo: string;
  subtitulo?: string;
  acao?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icone, titulo, subtitulo, acao }) => {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        {icone}
      </div>
      <h3 className="text-lg font-bold text-zinc-900">{titulo}</h3>
      {subtitulo ? <p className="mt-2 text-sm text-zinc-500">{subtitulo}</p> : null}
      {acao ? (
        <button
          onClick={acao.onClick}
          className="mt-4 rounded-xl bg-[#F5C400] px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-[#e0b300]"
        >
          {acao.label}
        </button>
      ) : null}
    </div>
  );
};
