import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

interface DashboardCoordenadorResponse {
  totalVoluntarios: number;
  voluntariosAtivos: number;
  lideresEmergentes: number;
}

interface PipelineStage {
  id: 'IDENTIFICADO' | 'DESENVOLVIMENTO' | 'PRONTO' | 'PROMOVIDO';
  label: string;
  total: number;
}

interface Params {
  state?: string;
  city?: string;
  role?: string;
}

export function useLeadershipPipeline(params: Params = {}) {
  const [dashboard, setDashboard] = useState<DashboardCoordenadorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    const query = new URLSearchParams();

    if (params.state) query.set('state', params.state);
    if (params.city) query.set('city', params.city);
    if (params.role) query.set('role', params.role);

    setLoading(true);
    setError(null);

    const result = await apiClient.get<DashboardCoordenadorResponse>(
      `/api/coordenador/dashboard${query.toString() ? `?${query.toString()}` : ''}`,
      { signal },
    );

    if (result.error) {
      setDashboard(null);
      setError(result.error);
      setLoading(false);
      return;
    }

    setDashboard(result.data);
    setLoading(false);
  }, [params]);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);

    return () => controller.abort();
  }, [refetch]);

  const pipeline = useMemo<PipelineStage[]>(() => {
    const total = dashboard?.totalVoluntarios ?? 0;
    const ativos = dashboard?.voluntariosAtivos ?? 0;
    const emergentes = dashboard?.lideresEmergentes ?? 0;

    return [
      { id: 'IDENTIFICADO', label: 'Identificado', total },
      { id: 'DESENVOLVIMENTO', label: 'Desenvolvimento', total: Math.max(ativos - emergentes, 0) },
      { id: 'PRONTO', label: 'Pronto', total: emergentes },
      { id: 'PROMOVIDO', label: 'Promovido', total: Math.floor(emergentes * 0.2) },
    ];
  }, [dashboard]);

  return { pipeline, loading, error, refetch };
}
