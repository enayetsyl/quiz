'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useOpsOverviewQuery } from '../hooks/use-ops-overview';

const formatInteger = (value: number): string => value.toLocaleString('en-US');

const formatCost = (value: number): string =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value > 1 ? 2 : 3,
    maximumFractionDigits: 5,
  });

const formatTimestamp = (value: string): string =>
  new Date(value).toLocaleString('en-US', {
    hour12: false,
  });

export const OpsPanel = (): JSX.Element => {
  const { data, isLoading, isFetching } = useOpsOverviewQuery();

  if (isLoading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Operations insight</CardTitle>
          <CardDescription>Loading queue metrics and error signals…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const lastGenerated = data ? formatTimestamp(data.generatedAt) : 'Pending';
  const tokensIn = data?.llmUsage.tokensIn ?? 0;
  const tokensOut = data?.llmUsage.tokensOut ?? 0;
  const totalTokens = tokensIn + tokensOut;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Operations insight</CardTitle>
            <CardDescription>
              Monitor queue pressure, model usage, and recent generation issues to keep the pipeline healthy.
            </CardDescription>
          </div>
          <div className="space-y-2 text-right text-xs text-muted-foreground">
            <p>Last updated</p>
            <Badge variant={isFetching ? 'outline' : 'default'}>
              {isFetching ? 'Refreshing…' : lastGenerated}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Queue metrics</h3>
            <span className="text-xs text-muted-foreground">
              Waiting + active jobs drive current load.
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Delayed</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.queues ?? []).map((queue) => (
                <TableRow key={queue.name}>
                  <TableCell className="font-medium capitalize">{queue.name}</TableCell>
                  <TableCell>{formatInteger(queue.waiting)}</TableCell>
                  <TableCell>{formatInteger(queue.active)}</TableCell>
                  <TableCell>{formatInteger(queue.delayed)}</TableCell>
                  <TableCell>{formatInteger(queue.failed)}</TableCell>
                  <TableCell>{formatInteger(queue.completed)}</TableCell>
                  <TableCell>
                    <Badge variant={queue.paused ? 'destructive' : 'success'}>
                      {queue.paused ? 'Paused' : 'Active'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <Separator />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">LLM usage (last {data?.llmUsage.windowHours ?? 24}h)</h3>
            <div className="grid gap-2 rounded-md border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tokens in</span>
                <span className="font-semibold">{formatInteger(tokensIn)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tokens out</span>
                <span className="font-semibold">{formatInteger(tokensOut)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total tokens</span>
                <span className="font-semibold">{formatInteger(totalTokens)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated cost</span>
                <span className="font-semibold">
                  {formatCost(data?.llmUsage.estimatedCostUsd ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Events counted</span>
                <span className="font-semibold">{formatInteger(data?.llmUsage.eventCount ?? 0)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Recent errors</h3>
            {data?.recentErrors.length ? (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                {data.recentErrors.map((error) => (
                  <div key={error.id} className="space-y-1 rounded-md border border-border/60 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        Page {error.pageNumber ?? '—'} ({error.uploadId ?? 'unknown upload'})
                      </span>
                      <span className="text-muted-foreground">{formatTimestamp(error.occurredAt)}</span>
                    </div>
                    <p className="text-muted-foreground">Attempt #{error.attemptNo ?? 0}</p>
                    <p className="whitespace-pre-line text-foreground">{error.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No recent generation errors detected.
              </p>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
};
