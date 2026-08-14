import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACPIA Console — Police Intelligence Platform",
  description: "ACPIA forensic workstation for authorized law enforcement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
