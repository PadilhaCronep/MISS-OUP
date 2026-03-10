import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

interface Missao {
  id: string;
  title: string;
  description: string;
  type: string;
  urgency: string;
  xp_reward: number;
  status: string;
}

interface MissoesResponse {
  missions: Missao[];
}

interface MissoesFiltros {
  status?: string;
  type?: string;
  urgency?: string;
}

const buildQuery = (filtros?: MissoesFiltros): string => {
  if (!filtros) return '';

  const params = new URLSearchParams();

  if (filtros.status) params.set('status', filtros.status);
  if (filtros.type) params.set('type', filtros.type);
  if (filtros.urgency) params.set('urgency', filtros.urgency);

  const query = params.toString();
  return query ? `?${query}` : '';
};

export function useMissoes(filtros?: MissoesFiltros) {
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const result = await apiClient.get<MissoesResponse>(`/api/missions${buildQuery(filtros)}`, { signal });

    if (result.error) {
      setMissoes([]);
      setError(result.error);
      setLoading(false);
      return;
    }

    setMissoes(result.data?.missions ?? []);
    setLoading(false);
  }, [filtros]);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);

    return () => controller.abort();
  }, [refetch]);

  return { missoes, loading, error, refetch };
}
