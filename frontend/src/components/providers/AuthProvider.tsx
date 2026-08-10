"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("acpia_token");
    if (!token && pathname !== "/login") {
      router.push("/login");
    }
  }, [pathname, router]);

  if (!isClient) return null;

  return <>{children}</>;
}
