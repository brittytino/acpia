"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  FolderOpen, Hash, Tag, Scale, MapPin, 
  Clock, CheckCircle, Database, AlertTriangle, Zap
} from "lucide-react";
import apiClient, { Case } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function CaseOverviewPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const data = await apiClient.getCase(caseId);
        setCaseData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6"><div className="skeleton h-32 w-full" /></div>
            <div className="card p-6"><div className="skeleton h-48 w-full" /></div>
          </div>
          <div className="card p-6"><div className="skeleton h-64 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return <div className="text-center text-slate-500 py-12">Case not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{caseData.title}</h1>
            <span className={`status-${caseData.status} text-sm px-3 py-1 rounded-full`}>
              {caseData.status.replace("_", " ")}
            </span>
            <span className={`risk-badge risk-${caseData.priority}`}>
              {caseData.priority} priority
            </span>
          </div>
          <p className="text-blue-400 font-mono text-sm flex items-center gap-2">
            <Hash size={14} /> {caseData.case_number}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Case Description
            </h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {caseData.description || "No description provided."}
            </p>
            
            {caseData.tags && caseData.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap gap-2">
                {caseData.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                    <Tag size={12} /> {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5 text-center">
              <Database size={24} className="mx-auto text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-white">{caseData.evidence_count}</div>
              <div className="text-xs text-slate-500">Evidence Items</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5 text-center">
              <Zap size={24} className="mx-auto text-purple-400 mb-2" />
              <div className="text-2xl font-bold text-white">{caseData.lead_count}</div>
              <div className="text-xs text-slate-500">Total Leads</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5 text-center">
              <AlertTriangle size={24} className={`mx-auto mb-2 ${caseData.pending_leads > 0 ? "text-amber-400" : "text-slate-500"}`} />
              <div className={`text-2xl font-bold ${caseData.pending_leads > 0 ? "text-amber-400" : "text-slate-400"}`}>
                {caseData.pending_leads}
              </div>
              <div className="text-xs text-slate-500">Pending Review</div>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="card p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Case Metadata
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Jurisdiction</div>
                  <div className="text-sm text-slate-200">{caseData.jurisdiction}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Opened At</div>
                  <div className="text-sm text-slate-200">{formatDate(caseData.opened_at)}</div>
                </div>
              </div>

              {caseData.closed_at && (
                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500">Closed At</div>
                    <div className="text-sm text-slate-200">{formatDate(caseData.closed_at)}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Scale size={16} className="text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Lead Investigator</div>
                  <div className="text-sm text-slate-200 font-mono text-xs mt-0.5">
                    {caseData.lead_investigator_id || "Unassigned"}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
