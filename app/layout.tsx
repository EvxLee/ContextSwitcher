import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Debate Referee | Court of Public Opinion",
  description: "A live AI court for arguments, fallacies, scoring, and final judgments.",
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
