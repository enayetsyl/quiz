'use client';

import { useCallback, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createUser } from '../api/create-user';
import { listUsers } from '../api/list-users';
import { updateUser } from '../api/update-user';
import type { CreateUserPayload, UpdateUserPayload } from '../types';

const usersQueryKey = ['users'];

export const useUsersQuery = () =>
  useQuery({
    queryKey: usersQueryKey,
    queryFn: listUsers,
    staleTime: 30_000
  });

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: CreateUserPayload) => {
      setIsPending(true);
      try {
        await createUser(payload);
        await queryClient.fetchQuery(usersQueryKey, listUsers);
      } finally {
        setIsPending(false);
      }
    },
    [queryClient]
  );

  return { mutateAsync, isPending };
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: UpdateUserPayload) => {
      setIsPending(true);
      try {
        await updateUser(payload);
        await queryClient.fetchQuery(usersQueryKey, listUsers);
      } finally {
        setIsPending(false);
      }
    },
    [queryClient]
  );

  return { mutateAsync, isPending };
};
