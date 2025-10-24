'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useLogoutMutation, useSessionQuery } from '@/features/auth/hooks/use-session-query';
import { GenerationDashboardPanel } from '@/features/generation/components/generation-dashboard-panel';
import { EditorialWorkspace } from '@/features/questions/components/editorial-workspace';
import { ExportPanel } from '@/features/exports/components/export-panel';
import { SettingsPanel } from '@/features/settings/components/settings-panel';
import { TaxonomyManager } from '@/features/taxonomy/components/taxonomy-manager';
import { UploadWorkflowPanel } from '@/features/uploads/components/upload-workflow-panel';
import { UserManagementPanel } from '@/features/users/components/user-management-panel';
import { OpsPanel } from '@/features/ops/components/ops-panel';

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading } = useSessionQuery();
  const logoutMutation = useLogoutMutation();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.replace('/login');
  };

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </main>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-lg font-bold">Operations dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Review system settings, monitor access, and keep the generation pipeline healthy.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{isAdmin ? 'Admin' : 'Approver'}</Badge>
            <Button variant="secondary" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </header>
        {isAdmin ? <OpsPanel /> : null}
        <SettingsPanel canManage={isAdmin} />
        <ExportPanel />
        <UploadWorkflowPanel />
        <GenerationDashboardPanel />
        <EditorialWorkspace />
        {isAdmin ? (
          <div className="space-y-6">
            <UserManagementPanel />
            <TaxonomyManager />
          </div>
        ) : null}
      </div>
    </main>
  );
}
