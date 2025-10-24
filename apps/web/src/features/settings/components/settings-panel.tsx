'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { useRotateApiTokenMutation, useSettingsQuery, useUpdateSettingsMutation } from '../hooks/use-settings';
import type { AppSettings } from '../types';

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Never updated';
  }

  const date = new Date(value);
  return date.toLocaleString();
};

type SettingsFormState = {
  rpmCap: string;
  workerConcurrency: string;
  queueProvider: string;
  rateLimitSafetyFactor: string;
  tokenEstimateInitial: string;
};

const toFormState = (settings: AppSettings): SettingsFormState => ({
  rpmCap: String(settings.rpmCap),
  workerConcurrency: String(settings.workerConcurrency),
  queueProvider: settings.queueProvider,
  rateLimitSafetyFactor: String(settings.rateLimitSafetyFactor),
  tokenEstimateInitial: String(settings.tokenEstimateInitial)
});

type SettingsPanelProps = {
  canManage: boolean;
};

export const SettingsPanel = ({ canManage }: SettingsPanelProps) => {
  const { data, isLoading } = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();
  const rotateMutation = useRotateApiTokenMutation();
  const [formState, setFormState] = useState<SettingsFormState | null>(null);
  const [rotatedToken, setRotatedToken] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setFormState(toFormState(data));
    }
  }, [data]);

  if (isLoading || !formState || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System settings</CardTitle>
          <CardDescription>Loading configuration…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleChange = <T extends keyof SettingsFormState>(field: T, value: string) => {
    setFormState((previous) =>
      previous
        ? {
            ...previous,
            [field]: value
          }
        : previous
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManage) {
      return;
    }

    await updateMutation.mutateAsync({
      rpmCap: Number(formState.rpmCap),
      workerConcurrency: Number(formState.workerConcurrency),
      queueProvider: formState.queueProvider,
      rateLimitSafetyFactor: Number(formState.rateLimitSafetyFactor),
      tokenEstimateInitial: Number(formState.tokenEstimateInitial)
    });
  };

  const handleRotate = async () => {
    if (!canManage) {
      return;
    }

    const response = await rotateMutation.mutateAsync();
    setRotatedToken(response?.token ?? null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>System settings</CardTitle>
            <CardDescription>
              Tune rate limits, worker capacity, and shared configuration for the quiz pipeline.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-2 text-sm text-muted-foreground">
            <span>Last updated</span>
            <span className="font-semibold text-foreground">{formatDateTime(data.updatedAt)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="rpm-cap">RPM cap</Label>
              <Input
                id="rpm-cap"
                type="number"
                min={1}
                max={1000}
                value={formState.rpmCap}
                onChange={(event) => handleChange('rpmCap', event.target.value)}
                required
                disabled={!canManage}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="worker-concurrency">Worker concurrency</Label>
              <Input
                id="worker-concurrency"
                type="number"
                min={1}
                max={50}
                value={formState.workerConcurrency}
                onChange={(event) => handleChange('workerConcurrency', event.target.value)}
                required
                disabled={!canManage}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="queue-provider">Queue provider</Label>
              <Input
                id="queue-provider"
                value={formState.queueProvider}
                onChange={(event) => handleChange('queueProvider', event.target.value)}
                required
                disabled={!canManage}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rate-limit-safety">Rate limit safety factor</Label>
              <Input
                id="rate-limit-safety"
                type="number"
                step="0.05"
                min={0.1}
                max={1}
                value={formState.rateLimitSafetyFactor}
                onChange={(event) => handleChange('rateLimitSafetyFactor', event.target.value)}
                required
                disabled={!canManage}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="token-estimate">Initial token estimate</Label>
              <Input
                id="token-estimate"
                type="number"
                min={500}
                value={formState.tokenEstimateInitial}
                onChange={(event) => handleChange('tokenEstimateInitial', event.target.value)}
                required
                disabled={!canManage}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>API token status:</span>
              <Badge variant={data.apiTokenConfigured ? 'success' : 'outline'}>
                {data.apiTokenConfigured ? 'Configured' : 'Not configured'}
              </Badge>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={updateMutation.isPending || !canManage}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={rotateMutation.isPending || !canManage}
                onClick={handleRotate}
              >
                {rotateMutation.isPending ? 'Rotating…' : 'Rotate API token'}
              </Button>
            </div>
          </div>
        </form>
        {rotatedToken ? (
          <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">New API token</p>
            <Separator className="mt-2" />
            <p className="mt-2 break-all">
              Store this token securely now. It will not be shown again.
              <br />
              <span className="font-medium text-foreground">{rotatedToken}</span>
            </p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {canManage
          ? 'Changes apply immediately to the running workers.'
          : 'You have read-only access to these settings.'}
      </CardFooter>
    </Card>
  );
};
