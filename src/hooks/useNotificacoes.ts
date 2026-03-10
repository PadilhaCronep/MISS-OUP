import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  action_link: string | null;
  is_read: boolean;
  created_at: string;
  extra_data: Record<string, unknown> | null;
}

interface UseNotificacoesOptions {
  enabled?: boolean;
  pollingMs?: number;
}

export function useNotificacoes(
  volunteerId: string | null,
  options: UseNotificacoesOptions = {},
) {
  const { enabled = true, pollingMs = 0 } = options;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!volunteerId || !enabled) {
        setNotifications([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await apiClient.get<AppNotification[]>(
        `/api/notificacoes?volunteerId=${volunteerId}`,
        { signal },
      );

      if (result.error) {
        setError(result.error);
        setNotifications([]);
        setLoading(false);
        return;
      }

      setNotifications(result.data ?? []);
      setLoading(false);
    },
    [volunteerId, enabled],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => {
      controller.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!volunteerId || !enabled || pollingMs <= 0) {
      return;
    }

    const interval = setInterval(() => {
      void load();
    }, pollingMs);

    return () => clearInterval(interval);
  }, [enabled, pollingMs, volunteerId, load]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    const result = await apiClient.patch<{ success: boolean }>(`/api/notificacoes/${id}/ler`, {});

    if (result.error) {
      setError(result.error);
      return false;
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification,
      ),
    );

    return true;
  }, []);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!volunteerId) return false;

    const result = await apiClient.patch<{ success: boolean }>('/api/notificacoes/ler-todas', {
      volunteerId,
    });

    if (result.error) {
      setError(result.error);
      return false;
    }

    setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));

    return true;
  }, [volunteerId]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    load,
    markAsRead,
    markAllAsRead,
  };
}
