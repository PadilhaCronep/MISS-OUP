import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext.tsx';
import { usePageTitle } from '../hooks/usePageTitle.ts';
import { getRoleHomePath } from '../lib/navigation.ts';

export const NotFound: React.FC = () => {
  usePageTitle('Pagina nao encontrada');
  const { user } = useAuth();
  const homePath = user ? getRoleHomePath(user.role) : '/onboarding';

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-xl w-full rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">404</p>
        <h1 className="mb-3 text-3xl font-black text-zinc-900">Pagina nao encontrada</h1>
        <p className="mb-8 text-zinc-600">
          O endereco que voce acessou nao existe ou foi movido.
        </p>
        <Link
          to={homePath}
          className="inline-flex items-center justify-center rounded-xl bg-[#F5C400] px-6 py-3 font-bold text-zinc-900 transition-colors hover:bg-[#e0b300]"
        >
          Ir para meu painel
        </Link>
      </div>
    </div>
  );
};
