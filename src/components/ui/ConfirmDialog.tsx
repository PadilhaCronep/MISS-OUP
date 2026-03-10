import React from 'react';

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  acaoLabel: string;
  onConfirmar: () => void | Promise<void>;
  onCancelar: () => void;
  perigoso?: boolean;
  carregando?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  aberto,
  titulo,
  descricao,
  acaoLabel,
  onConfirmar,
  onCancelar,
  perigoso = false,
  carregando = false,
}) => {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-zinc-900">{titulo}</h2>
        <p className="mt-2 text-sm text-zinc-600">{descricao}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => void onConfirmar()}
            disabled={carregando}
            aria-busy={carregando}
            className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${perigoso ? 'bg-red-600 hover:bg-red-500' : 'bg-zinc-900 hover:bg-zinc-800'} disabled:opacity-60`}
          >
            {carregando ? 'Processando...' : acaoLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
