'use client';

import { useCallback, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getSettings } from '../api/get-settings';
import { rotateApiToken } from '../api/rotate-api-token';
import { updateSettings } from '../api/update-settings';
import type { RotateTokenResponse, UpdateSettingsPayload } from '../types';

const settingsQueryKey = ['settings'];

export const useSettingsQuery = () =>
  useQuery({
    queryKey: settingsQueryKey,
    queryFn: getSettings,
    staleTime: 30_000
  });

export const useUpdateSettingsMutation = () => {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: UpdateSettingsPayload) => {
      setIsPending(true);
      try {
        await updateSettings(payload);
        await queryClient.fetchQuery(settingsQueryKey, getSettings);
      } finally {
        setIsPending(false);
      }
    },
    [queryClient]
  );

  return { mutateAsync, isPending };
};

export const useRotateApiTokenMutation = () => {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async () => {
    setIsPending(true);
    try {
      const response = await rotateApiToken();
      await queryClient.fetchQuery(settingsQueryKey, getSettings);
      return response;
    } finally {
      setIsPending(false);
    }
  }, [queryClient]);

  return { mutateAsync, isPending };
};
