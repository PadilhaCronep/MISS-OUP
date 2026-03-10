import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

interface TrilhaFormacao {
  id: string;
  title: string;
  description: string;
  percentage: number;
  is_completed: number;
  completed_modules: number;
  total_modules: number;
  next_module_id: string | null;
  has_certificate: boolean;
}

export function useFormacao(volunteerId: string | null) {
  const [trilhas, setTrilhas] = useState<TrilhaFormacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    if (!volunteerId) {
      setTrilhas([]);
      setError('Voluntario nao informado');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await apiClient.get<TrilhaFormacao[]>(`/api/formacao/trilhas?volunteerId=${volunteerId}`, {
      signal,
    });

    if (result.error) {
      setTrilhas([]);
      setError(result.error);
      setLoading(false);
      return;
    }

    setTrilhas(result.data ?? []);
    setLoading(false);
  }, [volunteerId]);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);

    return () => controller.abort();
  }, [refetch]);

  return { trilhas, loading, error, refetch };
}
