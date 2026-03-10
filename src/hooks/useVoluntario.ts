import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

interface VoluntarioProfile {
  id: string;
  name: string;
  email: string;
  state?: string;
  city?: string;
  role: string;
  xp_total: number;
  current_level: number;
  leadership_score: number;
}

interface VoluntarioHistoricoItem {
  id: string;
  mission_title: string;
  mission_type: string;
  xp_reward: number;
  validation_status: string;
  submitted_at: string;
}

interface VoluntarioBadgeItem {
  id: string;
  name: string;
  icon: string;
  earned_at: string;
}

interface VoluntarioResponse {
  volunteer: VoluntarioProfile;
  history: VoluntarioHistoricoItem[];
  badges: VoluntarioBadgeItem[];
}

export function useVoluntario(id: string | null) {
  const [data, setData] = useState<VoluntarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    if (!id) {
      setData(null);
      setError('Voluntario nao encontrado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await apiClient.get<VoluntarioResponse>(`/api/coordenador/voluntarios/${id}`, { signal });

    if (result.error) {
      setError(result.error);
      setData(null);
      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);

    return () => controller.abort();
  }, [refetch]);

  return { data, loading, error, refetch };
}
