import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

export interface MinhaFuncaoTask {
  id: string;
  title: string;
  description: string;
  status: string;
  deadline: string | null;
  estimated_hours: number | null;
  registered_hours: number;
}

export interface MinhaFuncaoOnboarding {
  status: string;
  current_step: number;
  completed_steps: string[];
}

export interface MinhaFuncaoMember {
  id: string;
  campaign_name: string;
  campaign_office: string;
  sector_name: string;
  sector_color: string;
  role_name: string;
  subsector_name?: string | null;
  joined_at: string;
  performance_score: number;
  tasks_completed: number;
  tasks_on_time: number;
  hours_registered: number;
  technical_competencies: string[];
  competencies_eval: Record<string, number>;
}

export interface MinhaFuncaoData {
  isMember: boolean;
  member: MinhaFuncaoMember | null;
  tasks: MinhaFuncaoTask[];
  onboarding: MinhaFuncaoOnboarding[];
  setor: {
    id: string;
    slug: string;
    name: string;
    color: string;
  } | null;
}

export function useMinhaFuncao(volunteerId: string | null) {
  const [data, setData] = useState<MinhaFuncaoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(
    async (signal?: AbortSignal) => {
      if (!volunteerId) {
        setData(null);
        setError('Usuario nao autenticado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await apiClient.get<MinhaFuncaoData>(
        `/api/voluntario/minha-funcao?volunteerId=${volunteerId}`,
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
    },
    [volunteerId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);

    return () => {
      controller.abort();
    };
  }, [refetch]);

  return { data, loading, error, refetch };
}
