import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import styles from "@/app/dashboard/dashboard.module.css";

export default function DashboardPage() {
  return (
    <main className={styles.main} id="top">
      <header className={styles.header}>
        <h2 className={styles.title}>Operations overview</h2>
        <p className={styles.subtitle}>
          This dashboard will become the command center for uploads, queue orchestration, and
          editorial review. For now it highlights the completed groundwork and the next milestones.
        </p>
      </header>
      <section className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>Upcoming development milestones.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className={styles.list}>
              <li>Implement authentication with role-aware access control.</li>
              <li>Build taxonomy management for classes, subjects, and chapters.</li>
              <li>Wire PDF ingestion and rasterization pipelines.</li>
            </ul>
            <Link
              href="#top"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              style={{ marginTop: "18px", display: "inline-flex" }}
            >
              Back to top
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Environment checklist</CardTitle>
            <CardDescription>What is already in place.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className={styles.list}>
              <li>Express API with health endpoint, structured logging, and request tracing.</li>
              <li>Prisma schema aligned with the reference PostgreSQL database.</li>
              <li>Next.js foundation powered by our shared UI components and query client.</li>
            </ul>
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              style={{ marginTop: "18px", display: "inline-flex" }}
            >
              Back to home
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
