"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Plus, Search, Filter, FolderOpen, AlertTriangle,
  ChevronRight, Clock, Shield, Loader2
} from "lucide-react";
import apiClient, { Case } from "@/lib/api";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showNewCase, setShowNewCase] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getCases({
        page,
        page_size: 20,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      });
      setCases(data.cases);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchCases, 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, priorityFilter, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FolderOpen className="text-blue-400" size={26} />
            Cases
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{total} total cases</p>
        </div>
        <button
          onClick={() => setShowNewCase(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          New Case
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases..."
            className="input pl-9"
            style={{ height: "38px" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
          style={{ width: "160px", height: "38px" }}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="input"
          style={{ width: "160px", height: "38px" }}
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-full" />
                <div className="flex gap-2">
                  <div className="skeleton h-6 w-16" />
                  <div className="skeleton h-6 w-16" />
                </div>
              </div>
            ))
          ) : cases.length === 0 ? (
            <div className="col-span-3 text-center py-16">
              <FolderOpen size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No cases found</p>
              <button onClick={() => setShowNewCase(true)} className="btn-primary mt-4">
                Create First Case
              </button>
            </div>
          ) : (
            cases.map((c, i) => (
              <motion.div
                key={c.case_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/cases/${c.case_id}`} className="card p-5 block hover:no-underline group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-mono text-blue-400 mb-1">{c.case_number}</p>
                      <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                        {c.title}
                      </h3>
                    </div>
                    <span className={`risk-badge risk-${c.priority} shrink-0 ml-2`}>
                      {c.priority}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">{c.jurisdiction}</p>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg" style={{ background: "var(--surface-elevated)" }}>
                      <div className="text-lg font-bold text-white">{c.evidence_count}</div>
                      <div className="text-xs text-slate-500">Evidence</div>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: "var(--surface-elevated)" }}>
                      <div className="text-lg font-bold text-white">{c.lead_count}</div>
                      <div className="text-xs text-slate-500">Leads</div>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: "var(--surface-elevated)" }}>
                      <div className={`text-lg font-bold ${c.pending_leads > 0 ? "text-amber-400" : "text-slate-400"}`}>
                        {c.pending_leads}
                      </div>
                      <div className="text-xs text-slate-500">Pending</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`status-${c.status}`}>
                      {c.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(c.opened_at).toLocaleDateString()}
                    </span>
                  </div>

                  {c.pending_leads > 0 && (
                    <div className="mt-3 p-2 rounded-lg flex items-center gap-2"
                      style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                      <AlertTriangle size={12} className="text-amber-400" />
                      <span className="text-xs text-amber-300">{c.pending_leads} lead(s) awaiting review</span>
                    </div>
                  )}
                </Link>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* New Case Modal */}
      <AnimatePresence>
        {showNewCase && <NewCaseModal onClose={() => setShowNewCase(false)} onCreated={fetchCases} />}
      </AnimatePresence>
    </div>
  );
}

function NewCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    case_number: `CASE-${Date.now().toString().slice(-6)}`,
    title: "",
    description: "",
    jurisdiction: "",
    priority: "medium",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiClient.createCase(form);
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        className="card w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Plus size={18} className="text-blue-400" />
          Create New Case
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Case Number</label>
              <input value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Case Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" required placeholder="Brief case description" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Jurisdiction</label>
            <input value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} className="input" required placeholder="Agency jurisdiction" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} placeholder="Optional case notes..." />
          </div>
          {error && (
            <div className="text-sm text-red-400 p-3 rounded" style={{ background: "rgba(239,68,68,0.1)" }}>{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Case
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
