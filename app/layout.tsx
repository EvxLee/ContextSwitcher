import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collina | AI Debate Playground",
  description: "Big opinions go in. Scores, fallacies, and a tiny bit of chaos come out.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
