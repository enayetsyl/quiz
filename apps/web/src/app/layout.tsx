import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NCTB Quiz Generator",
  description: "Internal tooling for quiz generation and review."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}

