export type ApiResponse<T> =
  | { data: T; error: null; status: number }
  | { data: null; error: string; status: number };

import { env } from '../config/env.ts';

const BASE_URL = env.API_URL;

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });

    const parsed = await parseJsonSafe(response);

    if (!response.ok) {
      const message =
        parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
          ? parsed.error
          : `Erro ${response.status}`;

      return {
        data: null,
        error: message,
        status: response.status,
      };
    }

    return {
      data: parsed as T,
      error: null,
      status: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro de rede';
    return {
      data: null,
      error: message,
      status: 0,
    };
  }
}

export const apiClient = {
  get: <T>(url: string, opts?: RequestInit): Promise<ApiResponse<T>> =>
    request<T>(url, { method: 'GET', ...opts }),

  post: <T>(url: string, body: unknown, opts?: RequestInit): Promise<ApiResponse<T>> =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body), ...opts }),

  put: <T>(url: string, body: unknown, opts?: RequestInit): Promise<ApiResponse<T>> =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),

  patch: <T>(url: string, body: unknown, opts?: RequestInit): Promise<ApiResponse<T>> =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body), ...opts }),

  delete: <T>(url: string, opts?: RequestInit): Promise<ApiResponse<T>> =>
    request<T>(url, { method: 'DELETE', ...opts }),
};

