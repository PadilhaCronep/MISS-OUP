import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Globe2, Megaphone, Rocket, XCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client.ts';

interface IntegrationItem {
  id: string;
  name: string;
  provider: string;
  category: string;
  integrationType: string;
  status: string;
  ownerRole: string | null;
  syncHealth: number;
  records24h: number;
  avgLatencyMs: number;
  errorRate: number;
  lastSyncAt: string | null;
  webhookUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationsResponse {
  campaign: { id: string; name: string; candidateName: string };
  summary: {
    total: number;
    active: number;
    attention: number;
    error: number;
    disconnected: number;
    totalRecords24h: number;
    avgLatencyMs: number;
    avgHealth: number;
  };
  categories: Array<{
    category: string;
    total: number;
    active: number;
    attention: number;
    error: number;
    disconnected: number;
    records24h: number;
    avgHealth: number;
  }>;
  digitalMedia: IntegrationItem[];
  externalSystems: IntegrationItem[];
  criticalAlerts: Array<{
    integrationId: string;
    name: string;
    status: string;
    ownerRole: string | null;
    message: string;
  }>;
  integrations: IntegrationItem[];
  generatedAt: string;
}

const statusStyle: Record<string, string> = {
  ATIVA: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  ATENCAO: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  ERRO: 'border-red-500/40 bg-red-500/10 text-red-300',
  DESCONECTADA: 'border-zinc-600 bg-zinc-800/70 text-zinc-300',
};

const statusLabel: Record<string, string> = {
  ATIVA: 'Ativa',
  ATENCAO: 'Atencao',
  ERRO: 'Erro',
  DESCONECTADA: 'Desconectada',
};

const formatSync = (dateValue: string | null): string => {
  if (!dateValue) return 'Sem sincronizacao recente';
  return new Date(dateValue).toLocaleString('pt-BR');
};

const IntegrationCard: React.FC<{ item: IntegrationItem }> = ({ item }) => (
  <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-semibold text-white">{item.name}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{item.provider} | {item.integrationType}</p>
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle[item.status] ?? statusStyle.DESCONECTADA}`}>
        {statusLabel[item.status] ?? item.status}
      </span>
    </div>

    <div className="mt-3 grid gap-2 text-[11px] text-zinc-300 sm:grid-cols-2">
      <p>Health: {item.syncHealth.toFixed(1)}%</p>
      <p>Registros 24h: {item.records24h.toLocaleString('pt-BR')}</p>
      <p>Latencia media: {item.avgLatencyMs.toFixed(0)} ms</p>
      <p>Taxa de erro: {item.errorRate.toFixed(2)}%</p>
    </div>

    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
      <div className="h-full rounded-full bg-[#F5C400]" style={{ width: `${Math.max(item.syncHealth, 6)}%` }} />
    </div>

    <p className="mt-2 text-[11px] text-zinc-500">Ultima sincronizacao: {formatSync(item.lastSyncAt)}</p>
  </article>
);

export const IntegrationsHub: React.FC = () => {
  const [data, setData] = useState<IntegrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<IntegrationsResponse>('/api/campaign-os/integrations');
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Falha ao carregar painel de integracoes.');
        setData(null);
        setLoading(false);
        return;
      }

      setData(result.data);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const summaryCards = useMemo(() => {
    if (!data) return [];

    return [
      { label: 'Integracoes totais', value: data.summary.total, icon: BarChart3 },
      { label: 'Integracoes ativas', value: data.summary.active, icon: CheckCircle2 },
      { label: 'Em atencao', value: data.summary.attention, icon: AlertTriangle },
      { label: 'Com erro', value: data.summary.error, icon: XCircle },
    ];
  }, [data]);

  if (loading) {
    return <div className="flex h-[45vh] items-center justify-center text-zinc-500">Carregando painel de integracoes...</div>;
  }

  if (error || !data) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error ?? 'Sem dados de integracoes.'}</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-3xl border border-zinc-800 bg-[#111111] p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Hub de conectividade</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Painel de Integracoes</h1>
            <p className="mt-1 text-sm text-zinc-400">{data.campaign.name} | {data.campaign.candidateName}</p>
          </div>
          <p className="text-xs text-zinc-500">Atualizado em {new Date(data.generatedAt).toLocaleString('pt-BR')}</p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <card.icon className="h-5 w-5 text-[#F5C400]" />
            </div>
            <p className="text-2xl font-black text-white">{card.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{card.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 xl:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Integracoes por categoria</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.categories.map((category) => (
              <div key={category.category} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400">{category.category.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-xl font-black text-white">{category.total}</p>
                <div className="mt-2 grid gap-1 text-[11px] text-zinc-400">
                  <p>Ativas: {category.active} | Atencao: {category.attention} | Erro: {category.error}</p>
                  <p>Registros 24h: {category.records24h.toLocaleString('pt-BR')}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-[#F5C400]" style={{ width: `${Math.max(category.avgHealth, 5)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Saude geral</h2>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            <p className="inline-flex items-center gap-2"><Megaphone className="h-4 w-4 text-[#F5C400]" /> Registros (24h): {data.summary.totalRecords24h.toLocaleString('pt-BR')}</p>
            <p className="inline-flex items-center gap-2"><Rocket className="h-4 w-4 text-[#F5C400]" /> Latencia media: {data.summary.avgLatencyMs.toFixed(0)} ms</p>
            <p className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-[#F5C400]" /> Health medio: {data.summary.avgHealth.toFixed(2)}%</p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Integracoes com midias digitais</h2>
          <div className="mt-3 space-y-2">
            {data.digitalMedia.map((item) => (
              <IntegrationCard key={item.id} item={item} />
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Integracoes com outros sistemas</h2>
          <div className="mt-3 space-y-2">
            {data.externalSystems.map((item) => (
              <IntegrationCard key={item.id} item={item} />
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Alertas de integracao</h2>
        {data.criticalAlerts.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sem alertas criticos no momento.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.criticalAlerts.map((alert) => (
              <div key={alert.integrationId} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{alert.name}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle[alert.status] ?? statusStyle.DESCONECTADA}`}>
                    {statusLabel[alert.status] ?? alert.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
