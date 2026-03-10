import React, { useMemo, useState } from 'react';
import { ArrowDownUp, Download } from 'lucide-react';
import type { ModoEstrategico, ScoresCidade } from '../../../lib/inteligencia-eleitoral.ts';

export interface ScoreCidadeRow extends ScoresCidade {
  latitude?: number | null;
  longitude?: number | null;
  votos_2022?: number | null;
  populacao_total?: number | null;
  pct_jovens_16_34?: number | null;
  pct_acesso_internet?: number | null;
  voluntarios_count_real?: number | null;
}

interface Props {
  scores: ScoreCidadeRow[];
  modo: ModoEstrategico;
}

type SortableKey =
  | 'cidade'
  | 'estado'
  | 'classificacao'
  | 'icd'
  | 'ipc'
  | 'iir'
  | 'ic'
  | 'io'
  | 'ivl'
  | 'see_territorial'
  | 'see_crescimento'
  | 'see_mobilizacao';

const getScorePorModo = (score: ScoreCidadeRow, modo: ModoEstrategico): number => {
  if (modo === 'TERRITORIAL') return score.see_territorial;
  if (modo === 'MOBILIZACAO') return score.see_mobilizacao;
  return score.see_crescimento;
};

export const RankingCidades: React.FC<Props> = ({ scores, modo }) => {
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [scoreMinimo, setScoreMinimo] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortableKey>('see_crescimento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const estados = useMemo(() => {
    return Array.from(new Set(scores.map((score) => score.estado))).sort();
  }, [scores]);

  const classificacoes = useMemo(() => {
    return Array.from(new Set(scores.map((score) => score.classificacao))).sort();
  }, [scores]);

  const rankingFiltrado = useMemo(() => {
    const filtrado = scores.filter((score) => {
      const matchClassificacao =
        filtroClassificacao === 'TODAS' || score.classificacao === filtroClassificacao;
      const matchEstado = filtroEstado === 'TODOS' || score.estado === filtroEstado;
      const matchScore = getScorePorModo(score, modo) >= scoreMinimo;
      return matchClassificacao && matchEstado && matchScore;
    });

    const sorted = [...filtrado].sort((a, b) => {
      const factor = sortDirection === 'asc' ? 1 : -1;
      const valueA = a[sortKey];
      const valueB = b[sortKey];

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * factor;
      }

      return String(valueA).localeCompare(String(valueB), 'pt-BR') * factor;
    });

    return sorted;
  }, [scores, filtroClassificacao, filtroEstado, scoreMinimo, sortKey, sortDirection, modo]);

  const ordenarPor = (key: SortableKey): void => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('desc');
  };

  const exportarCsv = (): void => {
    const header = [
      'cidade',
      'estado',
      'classificacao',
      'acao_sugerida',
      'icd',
      'ipc',
      'iir',
      'ic',
      'io',
      'ivl',
      'see_territorial',
      'see_crescimento',
      'see_mobilizacao',
    ];

    const rows = rankingFiltrado.map((score) =>
      [
        score.cidade,
        score.estado,
        score.classificacao,
        score.acao_sugerida,
        score.icd,
        score.ipc,
        score.iir,
        score.ic,
        score.io,
        score.ivl,
        score.see_territorial,
        score.see_crescimento,
        score.see_mobilizacao,
      ].join(','),
    );

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `ranking-inteligencia-${modo.toLowerCase()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-4">
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Classificacao</label>
          <select
            value={filtroClassificacao}
            onChange={(event) => setFiltroClassificacao(event.target.value)}
            className="bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
          >
            <option value="TODAS">Todas</option>
            {classificacoes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Estado</label>
          <select
            value={filtroEstado}
            onChange={(event) => setFiltroEstado(event.target.value)}
            className="bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
          >
            <option value="TODOS">Todos</option>
            {estados.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Score minimo</label>
          <input
            type="number"
            value={scoreMinimo}
            min={0}
            max={100}
            onChange={(event) => setScoreMinimo(Number(event.target.value))}
            className="bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white w-28"
          />
        </div>

        <button
          onClick={exportarCsv}
          className="ml-auto bg-[#F5C400] text-black px-4 py-2 rounded-md text-sm font-semibold hover:bg-yellow-400 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-white/10">
              {[
                ['cidade', 'Cidade'],
                ['estado', 'UF'],
                ['classificacao', 'Classificacao'],
                ['icd', 'ICD'],
                ['ipc', 'IPC'],
                ['iir', 'IIR'],
                ['ic', 'IC'],
                ['io', 'IO'],
                ['ivl', 'IVL'],
                ['see_territorial', 'SEE Territ.'],
                ['see_crescimento', 'SEE Cresc.'],
                ['see_mobilizacao', 'SEE Mob.'],
              ].map(([key, label]) => (
                <th key={key} className="py-2 pr-3">
                  <button
                    onClick={() => ordenarPor(key as SortableKey)}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    {label}
                    <ArrowDownUp className="w-3 h-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankingFiltrado.map((score) => (
              <tr key={`${score.cidade}_${score.estado}`} className="border-b border-white/5 text-white">
                <td className="py-2 pr-3 font-semibold">{score.cidade}</td>
                <td className="py-2 pr-3">{score.estado}</td>
                <td className="py-2 pr-3">{score.classificacao}</td>
                <td className="py-2 pr-3">{score.icd}</td>
                <td className="py-2 pr-3">{score.ipc}</td>
                <td className="py-2 pr-3">{score.iir}</td>
                <td className="py-2 pr-3">{score.ic.toFixed(1)}</td>
                <td className="py-2 pr-3">{score.io}</td>
                <td className="py-2 pr-3">{score.ivl}</td>
                <td className="py-2 pr-3">{score.see_territorial}</td>
                <td className="py-2 pr-3 text-[#F5C400] font-bold">{score.see_crescimento}</td>
                <td className="py-2 pr-3">{score.see_mobilizacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
