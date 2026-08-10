"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield, LayoutDashboard, FolderOpen, FileSearch, Network,
  Users, Settings, LogOut, AlertCircle, BarChart3, ChevronRight,
  Bell, Search
} from "lucide-react";

interface User {
  username: string;
  name: string;
  email: string;
  roles: string[];
}

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cases", icon: FolderOpen, label: "Cases" },
];

const CASE_NAV = (caseId: string) => [
  { href: `/cases/${caseId}`, icon: LayoutDashboard, label: "Overview" },
  { href: `/cases/${caseId}/evidence`, icon: FileSearch, label: "Evidence" },
  { href: `/cases/${caseId}/leads`, icon: AlertCircle, label: "Leads" },
  { href: `/cases/${caseId}/graph`, icon: Network, label: "Knowledge Graph" },
  { href: `/cases/${caseId}/report`, icon: BarChart3, label: "Report" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Extract case ID from pathname if present
  const caseMatch = pathname.match(/\/cases\/([^/]+)/);
  const activeCaseId = caseMatch?.[1];

  useEffect(() => {
    const token = localStorage.getItem("acpia_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const userData = localStorage.getItem("acpia_user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("acpia_token");
    localStorage.removeItem("acpia_refresh_token");
    localStorage.removeItem("acpia_user");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sidebar flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)" }}>
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">ACPIA</div>
              <div className="text-xs text-slate-500">Investigation System</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Navigation
            </span>
          </div>

          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}

          {/* Active Case Navigation */}
          {activeCaseId && (
            <div className="mt-4">
              <div className="px-4 mb-2 mt-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Case
                </span>
              </div>
              {CASE_NAV(activeCaseId).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-4 px-4 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              System
            </span>
          </div>
          <Link href="/admin" className={`sidebar-link ${pathname === "/admin" ? "active" : ""}`}>
            <Settings size={16} />
            Administration
          </Link>
        </nav>

        {/* User info & Logout */}
        <div className="p-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
              {user.name?.[0] || user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.name || user.username}</div>
              <div className="text-xs text-slate-500 truncate">
                {user.roles.includes("acpia-admin") ? "Administrator" :
                  user.roles.includes("acpia-supervisor") ? "Supervisor" : "Investigator"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
            style={{ padding: "8px 12px" }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content flex-1">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {/* Breadcrumb from pathname */}
            <span className="text-slate-500 text-sm">
              {pathname.split("/").filter(Boolean).map((seg, i, arr) => (
                <span key={i}>
                  <span className="capitalize">{seg}</span>
                  {i < arr.length - 1 && <ChevronRight size={14} className="inline mx-1 text-slate-600" />}
                </span>
              ))}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              <Bell size={16} />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
