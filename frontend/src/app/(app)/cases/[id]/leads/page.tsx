"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle, XCircle, MessageSquare, Eye,
  ChevronDown, ChevronUp, Filter, Loader2, TrendingUp,
  Clock, Bot, FileText
} from "lucide-react";
import apiClient, { Lead } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const RISK_TIER = (score: number) => {
  if (score >= 90) return { label: "Critical", cls: "risk-critical" };
  if (score >= 70) return { label: "High", cls: "risk-high" };
  if (score >= 40) return { label: "Medium", cls: "risk-medium" };
  return { label: "Low", cls: "risk-low" };
};

const AGENT_LABELS: Record<string, string> = {
  multimedia_analyst: "Multimedia Analyst",
  conversation_intelligence: "Conversation Intel",
  identity_resolution: "Identity Resolution",
  timeline_reconstruction: "Timeline Reconstruction",
  geospatial_intel: "Geospatial Intel",
  network_relations: "Network Relations",
  document_metadata: "Document Metadata",
  case_synthesis: "Case Synthesis",
};

export default function LeadsPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [leadsData, setLeadsData] = useState<{
    leads: Lead[];
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [reviewingLead, setReviewingLead] = useState<string | null>(null);
  const [annotation, setAnnotation] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getLeads(caseId, {
        status: statusFilter || undefined,
      });
      setLeadsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [caseId, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleReview = async (leadId: string, newStatus: "confirmed" | "rejected") => {
    setReviewingLead(leadId);
    try {
      await apiClient.reviewLead(leadId, { status: newStatus, annotation: annotation || undefined });
      setAnnotation("");
      setExpandedLead(null);
      await fetchLeads();
    } catch (err) {
      console.error("Review failed:", err);
    } finally {
      setReviewingLead(null);
    }
  };

  const leads = leadsData?.leads || [];

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-400" />
          AI-Generated Leads
        </h1>
      </div>

      {/* HITL Warning */}
      <div className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: "rgba(234, 88, 12, 0.08)", border: "1px solid rgba(234, 88, 12, 0.25)" }}>
        <AlertTriangle size={16} className="text-orange-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-orange-300 font-semibold">Human-in-the-Loop Required</p>
          <p className="text-xs text-orange-400/80 mt-1">
            All leads are AI-generated analytical suggestions. They require investigator review and confirmation
            before entering the case record. Risk scores are probabilistic, not determinations of fact.
          </p>
        </div>
      </div>

      {/* Stats */}
      {leadsData && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: leadsData.total, color: "#3b82f6" },
            { label: "Pending Review", value: leadsData.pending, color: "#f59e0b" },
            { label: "Confirmed", value: leadsData.confirmed, color: "#10b981" },
            { label: "Rejected", value: leadsData.rejected, color: "#64748b" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {["", "pending", "confirmed", "rejected", "under_review"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {status === "" ? "All" : status.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex gap-3">
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-4 w-full" />
              </div>
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Bot size={32} className="mx-auto mb-3 text-slate-600" />
            <p>No {statusFilter || ""} leads found.</p>
            <p className="text-sm mt-1">Trigger analysis from the Evidence tab to generate leads.</p>
          </div>
        ) : (
          <AnimatePresence>
            {leads.map((lead, i) => {
              const tier = RISK_TIER(lead.risk_score);
              const isExpanded = expandedLead === lead.lead_id;

              return (
                <motion.div
                  key={lead.lead_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card overflow-hidden"
                >
                  {/* Lead Header */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Risk score */}
                      <div className="shrink-0 text-center">
                        <div className="text-2xl font-bold" style={{ color: tier.cls.includes("critical") ? "#dc2626" : tier.cls.includes("high") ? "#ea580c" : tier.cls.includes("medium") ? "#ca8a04" : "#16a34a" }}>
                          {Math.round(lead.risk_score)}
                        </div>
                        <span className={`risk-badge ${tier.cls} text-xs`}>{tier.label}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}>
                            <Bot size={10} className="inline mr-1" />
                            {AGENT_LABELS[lead.generated_by_agent] || lead.generated_by_agent}
                          </span>
                          {lead.lead_type && (
                            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                              {lead.lead_type.replace(/_/g, " ")}
                            </span>
                          )}
                          <span className={lead.status === "pending" ? "status-pending" : lead.status === "confirmed" ? "status-confirmed" : "status-rejected"}>
                            {lead.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">{lead.summary}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(lead.generated_at)}
                          </span>
                          {lead.evidence_citations && (
                            <span className="flex items-center gap-1">
                              <FileText size={10} />
                              {lead.evidence_citations.length} citation(s)
                            </span>
                          )}
                          {lead.confidence_lower !== undefined && (
                            <span>
                              Confidence: {Math.round(lead.confidence_lower)}–{Math.round(lead.confidence_upper || lead.risk_score)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedLead(isExpanded ? null : lead.lead_id)}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ borderTop: "1px solid var(--border-subtle)" }}
                      >
                        <div className="p-5 space-y-4">
                          {/* Detailed Analysis */}
                          {lead.detailed_analysis && (
                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Detailed Analysis
                              </h4>
                              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {lead.detailed_analysis.substring(0, 1000)}
                              </p>
                            </div>
                          )}

                          {/* Evidence Citations */}
                          {lead.evidence_citations && lead.evidence_citations.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Evidence Citations
                              </h4>
                              <div className="space-y-2">
                                {lead.evidence_citations.map((citation, ci) => (
                                  <div key={ci} className="p-3 rounded-lg flex items-center gap-3"
                                    style={{ background: "var(--surface-elevated)" }}>
                                    <FileText size={14} className="text-blue-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-slate-300 truncate">
                                        {citation.original_filename || citation.evidence_id}
                                      </p>
                                      <p className="text-xs text-slate-500 font-mono">
                                        {citation.sha256_hash?.substring(0, 16)}…
                                        · Confidence: {Math.round(citation.confidence * 100)}%
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Human Review Section */}
                          {lead.status === "pending" && (
                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Investigator Review
                              </h4>
                              <textarea
                                value={annotation}
                                onChange={(e) => setAnnotation(e.target.value)}
                                placeholder="Optional annotation or notes for case record..."
                                className="input mb-3"
                                rows={2}
                              />
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleReview(lead.lead_id, "confirmed")}
                                  disabled={reviewingLead === lead.lead_id}
                                  className="btn-primary flex items-center gap-2 flex-1"
                                  style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
                                >
                                  {reviewingLead === lead.lead_id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <CheckCircle size={14} />
                                  )}
                                  Confirm Lead
                                </button>
                                <button
                                  onClick={() => handleReview(lead.lead_id, "rejected")}
                                  disabled={reviewingLead === lead.lead_id}
                                  className="btn-danger flex items-center gap-2 flex-1"
                                >
                                  <XCircle size={14} />
                                  Reject Lead
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Reviewer notes if already reviewed */}
                          {lead.reviewer_annotation && (
                            <div className="p-3 rounded-lg"
                              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                              <p className="text-xs text-green-400 font-semibold mb-1 flex items-center gap-1">
                                <MessageSquare size={11} /> Investigator Note
                              </p>
                              <p className="text-sm text-slate-300">{lead.reviewer_annotation}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
