'use client';

import { useCallback, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getCurrentUser } from '../api/get-current-user';
import { login, type LoginPayload } from '../api/login';
import { logout } from '../api/logout';
import { requestPasswordReset, type RequestPasswordResetPayload } from '../api/request-password-reset';
import { resetPassword, type ResetPasswordPayload } from '../api/reset-password';
import type { CurrentUser } from '../types';

const sessionQueryKey = ['session'];

export const useSessionQuery = () =>
  useQuery({
    queryKey: sessionQueryKey,
    queryFn: getCurrentUser,
    staleTime: 60_000
  });

export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: LoginPayload) => {
      setIsPending(true);
      try {
        await login(payload);
        await queryClient.fetchQuery(sessionQueryKey, getCurrentUser);
      } finally {
        setIsPending(false);
      }
    },
    [queryClient]
  );

  return { mutateAsync, isPending };
};

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async () => {
    setIsPending(true);
    try {
      await logout();
      await queryClient.fetchQuery(sessionQueryKey, getCurrentUser);
    } finally {
      setIsPending(false);
    }
  }, [queryClient]);

  return { mutateAsync, isPending };
};

export const useRequestPasswordResetMutation = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: RequestPasswordResetPayload) => {
      setIsPending(true);
      try {
        return await requestPasswordReset(payload);
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutateAsync, isPending };
};

export const useResetPasswordMutation = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: ResetPasswordPayload) => {
      setIsPending(true);
      try {
        await resetPassword(payload);
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutateAsync, isPending };
};
