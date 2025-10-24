'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { UserRole } from '@/features/auth/types';

import { useCreateUserMutation, useUpdateUserMutation, useUsersQuery } from '../hooks/use-users';
import type { UserSummary } from '../types';

const formatRelativeDate = (value: string | null) => {
  if (!value) {
    return 'Never';
  }

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  const diffMinutes = Math.round(diff / (1000 * 60));

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minutes');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) {
    return formatter.format(diffHours, 'hours');
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'days');
};

const roleLabel = (role: UserRole) => (role === 'admin' ? 'Admin' : 'Approver');

export const UserManagementPanel = () => {
  const { data: users, isLoading } = useUsersQuery();
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    role: 'approver' as UserRole
  });

  const sortedUsers = useMemo(() => {
    if (!users) {
      return [] as UserSummary[];
    }

    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await createMutation.mutateAsync({ ...formState });
    setFormState({ email: '', password: '', role: 'approver' });
  };

  const handleToggleActive = async (user: UserSummary) => {
    setPendingUserId(user.id);
    try {
      await updateMutation.mutateAsync({ userId: user.id, isActive: !user.isActive });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleToggleRole = async (user: UserSummary) => {
    setPendingUserId(user.id);
    const nextRole: UserRole = user.role === 'admin' ? 'approver' : 'admin';
    try {
      await updateMutation.mutateAsync({ userId: user.id, role: nextRole });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User management</CardTitle>
        <CardDescription>Invite teammates and manage access across the editorial workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="grid gap-4" onSubmit={handleCreate}>
          <div className="space-y-2">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((previous) => ({ ...previous, email: event.target.value }))}
              placeholder="editor@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-user-password">Temporary password</Label>
            <Input
              id="new-user-password"
              type="password"
              value={formState.password}
              onChange={(event) => setFormState((previous) => ({ ...previous, password: event.target.value }))}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-user-role">Role</Label>
            <select
              id="new-user-role"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              value={formState.role}
              onChange={(event) => setFormState((previous) => ({ ...previous, role: event.target.value as UserRole }))}
            >
              <option value="approver">Approver</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => {
              const isPending = pendingUserId === user.id && updateMutation.isPending;
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'success' : 'outline'}>{roleLabel(user.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatRelativeDate(user.lastLoginAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggleRole(user)}
                      >
                        {user.role === 'admin' ? 'Set as approver' : 'Promote to admin'}
                      </Button>
                      <Button
                        type="button"
                        variant={user.isActive ? 'destructive' : 'secondary'}
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableCaption>
            {isLoading ? 'Loading users…' : `${sortedUsers.length} account${sortedUsers.length === 1 ? '' : 's'} total`}
          </TableCaption>
        </Table>
      </CardContent>
    </Card>
  );
};
