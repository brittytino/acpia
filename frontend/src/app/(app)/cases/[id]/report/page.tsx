"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  FileText, Download, Shield, AlertTriangle, Printer, Loader2 
} from "lucide-react";
import apiClient from "@/lib/api";

export default function ReportPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await apiClient.generateReport(caseId);
      
      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ACPIA_Report_${caseId.substring(0,8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      console.error("Report generation failed:", err);
      alert("Failed to generate report. Make sure the backend PDF generator is running.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-900/30 mb-6">
          <FileText size={40} className="text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Investigation Report Generator</h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          Generate a comprehensive PDF intelligence report including all confirmed leads, 
          chain-of-custody logs, and knowledge graph summaries.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-8">
        <div className="space-y-6">
          
          <div className="p-4 rounded-lg bg-orange-900/20 border border-orange-500/30 flex items-start gap-4">
            <AlertTriangle size={20} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-300">Confidential Document Warning</h3>
              <p className="text-sm text-orange-400/80 mt-1">
                Generated reports contain sensitive law enforcement data, personally identifiable information, 
                and potentially illicit materials or descriptions. Ensure you follow your agency's data handling 
                procedures when downloading or printing.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Shield size={16} className="text-blue-400" /> Included in Report
              </h4>
              <ul className="text-sm text-slate-400 space-y-2">
                <li>• Case metadata and summary</li>
                <li>• Confirmed investigator leads</li>
                <li>• AI findings summary</li>
                <li>• Complete chain-of-custody audit log</li>
                <li>• Extracted entity index</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Printer size={16} className="text-purple-400" /> Formatting
              </h4>
              <ul className="text-sm text-slate-400 space-y-2">
                <li>• PDF format (court-ready)</li>
                <li>• Timestamped and watermarked</li>
                <li>• Cryptographic hashes included</li>
                <li>• Print-friendly styling</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-700 flex justify-center">
            <button
              onClick={handleDownload}
              disabled={generating}
              className="btn-primary text-base py-3 px-8 flex items-center gap-3"
            >
              {generating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating Secure PDF...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Download Investigation Report
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
