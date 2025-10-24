'use client';

import Link from "next/link";
import type { SVGProps } from "react";

import { buttonVariants } from "@/components/ui/button";
import { HealthStatusCard } from "@/features/health/components/health-status-card";
import styles from "@/features/home/components/home-page-content.module.css";

import { appName } from "@quizgen/shared";

type IconProps = SVGProps<SVGSVGElement>;

const ArrowRightIcon = (props: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    aria-hidden
    focusable="false"
    {...props}
  >
    <path
      d="M5 12h14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M13 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const HomePageContent = (): JSX.Element => {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <span className={styles.badge}>Setup complete</span>
        <h1 className={styles.title}>{appName}</h1>
        <p className={styles.description}>
          The development environment is ready. Continue to the dashboard to explore the
          upcoming workflows for uploads, generation queues, and editorial review as we deliver
          the remaining features.
        </p>
        <div className={styles.actions}>
          <Link href="/dashboard" className={buttonVariants({ variant: "default", size: "lg" })}>
            Go to dashboard
            <ArrowRightIcon style={{ marginLeft: "8px" }} />
          </Link>
        </div>
      </section>
      <HealthStatusCard />
    </main>
  );
};
