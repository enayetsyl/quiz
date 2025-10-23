import Link from "next/link";

import { appName } from "@quizgen/shared";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{appName}</h1>
      <p style={{ marginBottom: "1rem" }}>
        স্থানীয় ডেভেলপমেন্ট সেটআপ সক্রিয়। বৈশিষ্ট্য উন্নয়নের তালিকার জন্য পরিকল্পনা অনুসরণ
        করুন।
      </p>
      <Link href="/dashboard" style={{ color: "#2563eb", textDecoration: "underline" }}>
        ড্যাশবোর্ডে যান
      </Link>
    </main>
  );
}
