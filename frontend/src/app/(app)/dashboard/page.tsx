"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FolderOpen, Clock, CheckCircle, AlertTriangle, TrendingUp,
  Activity, Database, Cpu, HardDrive, Plus, ChevronRight,
  Shield, Zap, Eye
} from "lucide-react";
import apiClient, { Case } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const RISK_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  under_review: "#8b5cf6",
  closed: "#10b981",
  archived: "#64748b",
};

interface SystemMetrics {
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  active_agents?: number;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics] = useState<SystemMetrics>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.getCases({ page_size: 10 });
        setCases(data.cases);
      } catch (err) {
        console.error("Failed to fetch cases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aggregate stats from cases
  const stats = {
    total: cases.length,
    open: cases.filter(c => c.status === "open").length,
    totalEvidence: cases.reduce((sum, c) => sum + c.evidence_count, 0),
    totalLeads: cases.reduce((sum, c) => sum + c.lead_count, 0),
    pendingLeads: cases.reduce((sum, c) => sum + c.pending_leads, 0),
  };

  const priorityData = [
    { name: "Critical", value: cases.filter(c => c.priority === "critical").length, color: RISK_COLORS.critical },
    { name: "High", value: cases.filter(c => c.priority === "high").length, color: RISK_COLORS.high },
    { name: "Medium", value: cases.filter(c => c.priority === "medium").length, color: RISK_COLORS.medium },
    { name: "Low", value: cases.filter(c => c.priority === "low").length, color: RISK_COLORS.low },
  ];

  const statusData = [
    { name: "Open", value: cases.filter(c => c.status === "open").length },
    { name: "Review", value: cases.filter(c => c.status === "under_review").length },
    { name: "Closed", value: cases.filter(c => c.status === "closed").length },
    { name: "Archived", value: cases.filter(c => c.status === "archived").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="text-blue-400" size={28} />
            Investigation Dashboard
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Real-time case intelligence overview · All AI leads require human review
          </p>
        </div>
        <Link href="/cases/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Case
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Cases", value: loading ? "—" : stats.total, icon: FolderOpen, color: "#3b82f6", sub: `${stats.open} open` },
          { label: "Evidence Items", value: loading ? "—" : stats.totalEvidence.toLocaleString(), icon: Database, color: "#8b5cf6", sub: "ingested & hashed" },
          { label: "Total Leads", value: loading ? "—" : stats.totalLeads, icon: Zap, color: "#06b6d4", sub: `${stats.pendingLeads} pending review` },
          { label: "Pending Review", value: loading ? "—" : stats.pendingLeads, icon: Eye, color: "#f59e0b", sub: "require investigator action" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}20`, border: `1px solid ${stat.color}40` }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            Case Priority Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {priorityData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-purple-400" />
            Case Status Breakdown
          </h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={Object.values(STATUS_COLORS)[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: Object.values(STATUS_COLORS)[i] }} />
                    <span className="text-slate-400">{s.name}</span>
                  </div>
                  <span className="font-medium text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Cases */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FolderOpen size={16} className="text-blue-400" />
              Recent Cases
            </h3>
            <Link href="/cases" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case Number</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Evidence</th>
                <th>Pending Leads</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}>
                        <div className="skeleton h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-500 py-8">
                    No cases yet. <Link href="/cases/new" className="text-blue-400 hover:underline">Create your first case</Link>
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.case_id}>
                    <td className="font-mono text-sm text-blue-400">{c.case_number}</td>
                    <td className="font-medium text-white max-w-xs truncate">{c.title}</td>
                    <td>
                      <span className={`status-${c.status}`}>
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge risk-${c.priority}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="text-slate-300">{c.evidence_count.toLocaleString()}</td>
                    <td>
                      {c.pending_leads > 0 ? (
                        <span className="text-amber-400 font-semibold">{c.pending_leads}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/cases/${c.case_id}`}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
                      >
                        View <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
