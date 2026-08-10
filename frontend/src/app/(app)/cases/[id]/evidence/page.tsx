"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileImage, FileVideo, FileAudio, FileText, File,
  CheckCircle, AlertTriangle, Loader2, Search, Filter, Hash,
  Shield, Eye
} from "lucide-react";
import apiClient, { EvidenceItem } from "@/lib/api";
import { formatFileSize, formatDate } from "@/lib/utils";

const MIME_ICONS: Record<string, React.ElementType> = {
  "image/": FileImage,
  "video/": FileVideo,
  "audio/": FileAudio,
  "text/": FileText,
};

function getMimeIcon(mimeType: string) {
  const match = Object.keys(MIME_ICONS).find((prefix) => mimeType.startsWith(prefix));
  return match ? MIME_ICONS[match] : File;
}

function StatusBadge({ status }: { status: EvidenceItem["processing_status"] }) {
  const configs = {
    pending: { label: "Pending", cls: "status-pending" },
    processing: { label: "Processing", cls: "status-pending" },
    completed: { label: "Analyzed", cls: "status-confirmed" },
    failed: { label: "Failed", cls: "status-rejected" },
  };
  const { label, cls } = configs[status];
  return <span className={cls}>{label}</span>;
}

export default function EvidencePage() {
  const params = useParams();
  const caseId = params.id as string;
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [mimeFilter, setMimeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  const fetchEvidence = useCallback(async () => {
    try {
      const data = await apiClient.getEvidence(caseId, {
        mime_type: mimeFilter || undefined,
        processing_status: statusFilter || undefined,
      });
      setEvidence(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [caseId, mimeFilter, statusFilter]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    setUploadErrors([]);
    setUploadProgress(0);

    try {
      await apiClient.uploadEvidence(caseId, acceptedFiles, setUploadProgress);
      await fetchEvidence();
    } catch (err: unknown) {
      setUploadErrors([err instanceof Error ? err.message : "Upload failed"]);
    } finally {
      setUploading(false);
    }
  }, [caseId, fetchEvidence]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 500 * 1024 * 1024,
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisMessage("");
    try {
      const result = await apiClient.triggerAnalysis(caseId);
      setAnalysisMessage(result.message);
    } catch (err: unknown) {
      setAnalysisMessage(err instanceof Error ? err.message : "Analysis trigger failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const pendingCount = evidence.filter(e => e.processing_status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-blue-400" />
          Evidence Management
        </h1>
        {pendingCount > 0 && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="btn-primary flex items-center gap-2"
          >
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            Analyze {pendingCount} Pending Items
          </button>
        )}
      </div>

      {analysisMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg flex items-center gap-3"
          style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)" }}
        >
          <CheckCircle size={16} className="text-blue-400" />
          <span className="text-sm text-blue-300">{analysisMessage}</span>
        </motion.div>
      )}

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? "drag-over" : ""}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-3">
            <Loader2 size={32} className="mx-auto text-blue-400 animate-spin" />
            <p className="text-slate-400">Uploading evidence... {uploadProgress}%</p>
            <div className="progress-bar max-w-xs mx-auto">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-xs text-slate-500">
              Hashing, MIME detection, chain-of-custody logging...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="mx-auto text-slate-500" />
            <p className="text-slate-300 font-medium">
              {isDragActive ? "Drop files here" : "Drag & drop evidence files or click to browse"}
            </p>
            <p className="text-xs text-slate-500">
              Images, video, audio, documents, archives — up to 500MB per file
            </p>
            <p className="text-xs text-slate-600">
              Files are SHA-256 hashed and chain-of-custody logged on upload
            </p>
          </div>
        )}
      </div>

      {uploadErrors.length > 0 && (
        <div className="p-3 rounded-lg space-y-1" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          {uploadErrors.map((err, i) => (
            <p key={i} className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle size={12} /> {err}
            </p>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={mimeFilter} onChange={(e) => setMimeFilter(e.target.value)} className="input" style={{ width: "180px", height: "36px" }}>
          <option value="">All Types</option>
          <option value="image">Images</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="text">Text / Chat</option>
          <option value="application/pdf">PDF</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input" style={{ width: "160px", height: "36px" }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Analyzed</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-sm text-slate-500 ml-auto">{evidence.length} items</span>
      </div>

      {/* Evidence Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Filename</th>
              <th>SHA-256</th>
              <th>Size</th>
              <th>Status</th>
              <th>Hash Match</th>
              <th>Ingested</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : evidence.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  No evidence uploaded yet. Use the drop zone above.
                </td>
              </tr>
            ) : (
              evidence.map((ev) => {
                const Icon = getMimeIcon(ev.mime_type);
                return (
                  <tr key={ev.evidence_id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-slate-400" />
                        <span className="text-xs text-slate-500">{ev.mime_type.split("/")[0]}</span>
                      </div>
                    </td>
                    <td className="max-w-xs">
                      <span className="truncate block text-white font-medium" title={ev.original_filename}>
                        {ev.original_filename}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-500 flex items-center gap-1">
                        <Hash size={10} />
                        {ev.sha256_hash.substring(0, 12)}…
                      </span>
                    </td>
                    <td className="text-slate-300 text-sm">{formatFileSize(ev.file_size_bytes)}</td>
                    <td><StatusBadge status={ev.processing_status} /></td>
                    <td>
                      {ev.is_known_hash_match ? (
                        <span className="text-red-400 text-xs flex items-center gap-1 font-semibold">
                          <AlertTriangle size={12} /> MATCH
                        </span>
                      ) : (
                        <span className="text-green-500 text-xs flex items-center gap-1">
                          <CheckCircle size={11} /> Clear
                        </span>
                      )}
                    </td>
                    <td className="text-slate-400 text-sm">{formatDate(ev.ingested_at)}</td>
                    <td>
                      <button className="text-blue-400 hover:text-blue-300 text-xs">
                        Audit Log
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
