import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiResponse } from "@/lib/api-client";

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApi<T>(endpoint: string, options: UseApiOptions = {}) {
  const { immediate = true, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response: ApiResponse<T> = await apiClient.get(endpoint);

    if (response.error) {
      setError(response.error);
      onError?.(response.error);
    } else {
      setData(response.data);
      onSuccess?.(response.data);
    }

    setLoading(false);
  }, [endpoint, onSuccess, onError]);

  const refresh = useCallback(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    refresh,
    execute,
  };
}

// Hook for POST requests
export function useApiMutation<TData, TVariables = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (
      endpoint: string,
      variables?: TVariables,
      options?: {
        onSuccess?: (data: TData) => void;
        onError?: (error: string) => void;
      }
    ) => {
      setLoading(true);
      setError(null);

      const response: ApiResponse<TData> = await apiClient.post(
        endpoint,
        variables
      );

      if (response.error) {
        setError(response.error);
        options?.onError?.(response.error);
        setLoading(false);
        return { success: false, data: null, error: response.error };
      } else {
        options?.onSuccess?.(response.data!);
        setLoading(false);
        return { success: true, data: response.data, error: null };
      }
    },
    []
  );

  return {
    mutate,
    loading,
    error,
  };
}
