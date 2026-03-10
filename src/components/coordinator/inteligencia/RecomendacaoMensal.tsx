import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Target, TrendingUp } from 'lucide-react';
import { apiClient } from '../../../lib/api-client.ts';
import { ErrorState } from '../../ui/ErrorState.tsx';
import { SkeletonLoader } from '../../ui/SkeletonLoader.tsx';
import type { ModoEstrategico, ScoresCidade } from '../../../lib/inteligencia-eleitoral.ts';

interface RecomendacaoResponse {
  cidades: ScoresCidade[];
  resumo: string;
  prioridade: ModoEstrategico;
}

interface Props {
  modo: ModoEstrategico;
}

const getScore = (cidade: ScoresCidade, modo: ModoEstrategico): number => {
  if (modo === 'TERRITORIAL') return cidade.see_territorial;
  if (modo === 'MOBILIZACAO') return cidade.see_mobilizacao;
  return cidade.see_crescimento;
};

export const RecomendacaoMensal: React.FC<Props> = ({ modo }) => {
  const [data, setData] = useState<RecomendacaoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiClient.get<RecomendacaoResponse>(`/api/inteligencia/recomendacao-mensal?modo=${modo}`);

    if (result.error) {
      setError(result.error);
      setData(null);
      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  }, [modo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5">
        <SkeletonLoader variant="list-item" count={5} className="mb-2" />
      </div>
    );
  }

  if (error) {
    return <ErrorState mensagem={error} onRetry={() => void carregar()} compact />;
  }

  if (!data || data.cidades.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5">
        <p className="text-sm text-gray-400">Sem recomendacoes disponiveis. Recalcule os scores.</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-[#F5C400]" /> Onde ir este mes
          </h2>
          <p className="text-xs text-gray-400 mt-1">{data.resumo}</p>
        </div>
      </div>

      <div className="space-y-2">
        {data.cidades.map((cidade) => (
          <div
            key={`${cidade.cidade}_${cidade.estado}`}
            className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#F5C400]" />
                {cidade.cidade} - {cidade.estado}
              </p>
              <p className="text-xs text-gray-400">
                {cidade.classificacao} | Acao sugerida: {cidade.acao_sugerida.replaceAll('_', ' ')}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-[#F5C400]">{getScore(cidade, modo)}/100</p>
              <p className="text-[10px] text-gray-500 uppercase">Score {modo.toLowerCase()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-400">
        <TrendingUp className="w-4 h-4 text-green-400" />
        Prioridade atual: {data.prioridade}
      </div>
    </section>
  );
};
