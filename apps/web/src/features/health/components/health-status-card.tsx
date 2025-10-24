'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useHealthQuery } from "@/features/health/hooks/use-health-query";
import styles from "@/features/health/components/health-status-card.module.css";
import { cn } from "@/lib/utils";

import { formatDisplayDateTime } from "@quizgen/shared";

type IconProps = {
  className?: string;
};

const ServerIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="20"
    height="20"
    aria-hidden
    focusable="false"
  >
    <rect x="3" y="4" width="18" height="7" rx="2" fill="currentColor" opacity="0.12" />
    <rect x="3" y="13" width="18" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <circle cx="8" cy="16.5" r="1.1" fill="currentColor" />
    <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
  </svg>
);

const CheckCircleIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="18"
    height="18"
    aria-hidden
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <path
      d="M9.2 12.7l1.9 1.9 3.9-4.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LoaderIcon = ({ className }: IconProps) => (
  <svg
    className={cn(className, styles.spinner)}
    viewBox="0 0 24 24"
    width="18"
    height="18"
    aria-hidden
    focusable="false"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
      opacity="0.2"
      fill="none"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const RefreshIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="18"
    height="18"
    aria-hidden
    focusable="false"
  >
    <path
      d="M20 11a8 8 0 1 0-2.4 5.7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 7v4h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HealthStatusCard = (): JSX.Element => {
  const { data, isLoading, isError, refetch, isFetching } = useHealthQuery();

  return (
    <Card className={styles.wrapper}>
      <CardHeader>
        <CardTitle className={styles.header}>
          <ServerIcon /> API Health
        </CardTitle>
        <CardDescription className={styles.subtitle}>
          Live status reported by the backend service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className={styles.loadingRow}>
            <LoaderIcon /> Checking status...
          </div>
        ) : isError || !data ? (
          <div className={styles.errorBox}>
            <span>Unable to reach the API right now.</span>
            <Button
              onClick={() => void refetch()}
              size="sm"
              variant="outline"
            >
              <RefreshIcon /> Try again
            </Button>
          </div>
        ) : (
          <div>
            <div className={styles.statusRow}>
              <CheckCircleIcon /> {data.status}
            </div>
            <div className={styles.metrics}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Service</div>
                <div className={styles.metricValue}>{data.service}</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Timestamp</div>
                <div className={styles.metricValue}>
                  {formatDisplayDateTime(new Date(data.timestamp))}
                </div>
              </div>
              {data.info ? (
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Environment</div>
                  <div className={styles.metricValue}>
                    {String(data.info.environment ?? "unknown")}
                  </div>
                  <div className={styles.metricLabel} style={{ marginTop: "12px" }}>
                    Hostname
                  </div>
                  <div className={styles.metricValue}>
                    {String(data.info.hostname ?? "n/a")}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
        <div className={styles.actions}>
          <Button
            onClick={() => void refetch()}
            variant="secondary"
            disabled={isFetching}
          >
            <RefreshIcon className={isFetching ? styles.spinner : undefined} />
            {isFetching ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
