import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle.ts';

export const NotFound: React.FC = () => {
  usePageTitle('Página não encontrada');
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-xl w-full rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400 mb-3">404</p>
        <h1 className="text-3xl font-black text-zinc-900 mb-3">Página não encontrada</h1>
        <p className="text-zinc-600 mb-8">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center bg-[#F5C400] text-zinc-900 px-6 py-3 rounded-xl font-bold hover:bg-[#e0b300] transition-colors"
        >
          Ir para o início
        </Link>
      </div>
    </div>
  );
};


