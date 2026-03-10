import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

export interface CampaignSubsector {
  id: string;
  name: string;
  slug: string;
}

export interface CampaignSector {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  members_count?: number;
  tasks_total?: number;
  tasks_done?: number;
  subsetores: CampaignSubsector[];
  subsectors?: CampaignSubsector[];
}

export type CampaignTaskStatus = 'PENDENTE' | 'EM_PROGRESSO' | 'REVISAO' | 'CONCLUIDA';
export type CampaignTaskPriority = 'BAIXA' | 'MEDIA' | 'ALTA';

export interface CampaignTaskWorkspace {
  id: string;
  campaign_id: string;
  sector_id: string;
  subsector_id: string | null;
  title: string;
  description: string | null;
  status: CampaignTaskStatus;
  priority: CampaignTaskPriority;
  xp_reward: number;
  deadline: string | null;
  estimated_hours: number | null;
  registered_hours: number;
  assigned_to: string | null;
  created_at: string;
  sector_name: string;
  sector_slug: string;
  sector_color: string | null;
  subsector_name: string | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
}

export interface CampaignMemberWorkspace {
  member_id: string;
  volunteer_id: string;
  sector_id: string;
  role: string | null;
  performance_score: number | null;
  name: string;
  email: string;
  sector_name: string;
}

export interface CampaignDetailsData {
  id: string;
  name: string;
  office: string;
  candidate_name: string;
  sectors: CampaignSector[];
  tasks: CampaignTaskWorkspace[];
  members: CampaignMemberWorkspace[];
}

export function useCampanha(id: string | null) {
  const [campanha, setCampanha] = useState<CampaignDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) {
        setCampanha(null);
        setError('Campanha nao encontrada.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await apiClient.get<CampaignDetailsData>(`/api/campanha/${id}`, { signal });

      if (result.error) {
        setCampanha(null);
        setError(result.error);
        setLoading(false);
        return;
      }

      const sectors = result.data?.sectors?.map((sector) => ({
        ...sector,
        subsetores: sector.subsetores ?? sector.subsectors ?? [],
      }));

      setCampanha({
        ...(result.data as CampaignDetailsData),
        sectors: sectors ?? [],
        tasks: result.data?.tasks ?? [],
        members: result.data?.members ?? [],
      });
      setLoading(false);
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);

    return () => {
      controller.abort();
    };
  }, [refetch]);

  return { campanha, loading, error, refetch };
}
