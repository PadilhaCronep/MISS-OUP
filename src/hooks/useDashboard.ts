import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

type DashboardTipo = 'voluntario' | 'coordenador';

interface DashboardVoluntarioResponse {
  xp_total: number;
  current_level: number;
  current_streak: number;
  missions_completed: number;
  volunteers_recruited: number;
  cityRanking: number;
  stateRanking: number;
  nationalRanking: number;
}

interface DashboardCoordenadorResponse {
  totalVoluntarios: number;
  voluntariosAtivos: number;
  submissoesPendentes: number;
  lideresEmergentes: number;
  taxaEngajamento: number;
  crescimentoMes: number;
  crescimentoMesAnterior: number;
  atividadeRecente: Array<Record<string, unknown>>;
  distribuicaoNiveis: Array<Record<string, unknown>>;
  topPerformers: Array<Record<string, unknown>>;
}

interface DashboardCoordenadorParams {
  state?: string;
  city?: string;
  role?: string;
}

interface DashboardParams {
  tipo: DashboardTipo;
  userId?: string | null;
  coordenador?: DashboardCoordenadorParams;
}

export function useDashboard({ tipo, userId, coordenador }: DashboardParams) {
  const [data, setData] = useState<DashboardVoluntarioResponse | DashboardCoordenadorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    if (tipo === 'voluntario') {
      if (!userId) {
        setData(null);
        setError('Usuario nao informado');
        setLoading(false);
        return;
      }

      const result = await apiClient.get<DashboardVoluntarioResponse>(`/api/users/${userId}/stats`, { signal });

      if (result.error) {
        setData(null);
        setError(result.error);
        setLoading(false);
        return;
      }

      setData(result.data);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (coordenador?.state) params.set('state', coordenador.state);
    if (coordenador?.city) params.set('city', coordenador.city);
    if (coordenador?.role) params.set('role', coordenador.role);

    const query = params.toString();
    const result = await apiClient.get<DashboardCoordenadorResponse>(
      `/api/coordenador/dashboard${query ? `?${query}` : ''}`,
      { signal },
    );

    if (result.error) {
      setData(null);
      setError(result.error);
      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  }, [tipo, userId, coordenador]);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);

    return () => controller.abort();
  }, [refetch]);

  return { data, loading, error, refetch };
}
