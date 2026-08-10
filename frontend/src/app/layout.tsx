import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ACPIA — Agentic Child Protection Investigation Assistant",
  description:
    "AI-assisted digital evidence intelligence system for authorized law enforcement. Secure, air-gapped, human-in-the-loop.",
  keywords: ["law enforcement", "digital forensics", "investigation", "AI", "evidence"],
  robots: "noindex, nofollow", // Sensitive system - no indexing
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-gray-100 min-h-screen`}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
