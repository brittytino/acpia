/**
 * ACPIA API Client
 * Type-safe client for all backend API endpoints.
 */

import axios, { AxiosInstance } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

// ─── Types ───────────────────────────────────────────

export interface Case {
  case_id: string;
  case_number: string;
  title: string;
  description?: string;
  opened_at: string;
  closed_at?: string;
  status: "open" | "under_review" | "closed" | "archived";
  priority: "critical" | "high" | "medium" | "low";
  lead_investigator_id?: string;
  jurisdiction: string;
  tags?: string[];
  evidence_count: number;
  lead_count: number;
  pending_leads: number;
}

export interface EvidenceItem {
  evidence_id: string;
  case_id: string;
  sha256_hash: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  ingested_at: string;
  ingested_by: string;
  storage_path: string;
  processing_status: "pending" | "processing" | "completed" | "failed";
  is_known_hash_match: boolean;
  exif_metadata?: Record<string, unknown>;
  content_description?: string;
  severity_tier?: number;
}

export interface EvidenceCitation {
  evidence_id: string;
  original_filename?: string;
  sha256_hash: string;
  excerpt_ref?: string;
  excerpt_text?: string;
  mime_type: string;
  confidence: number;
}

export interface Lead {
  lead_id: string;
  case_id: string;
  generated_by_agent: string;
  risk_score: number;
  confidence_lower?: number;
  confidence_upper?: number;
  status: "pending" | "confirmed" | "rejected" | "under_review";
  summary: string;
  detailed_analysis?: string;
  evidence_citations?: EvidenceCitation[];
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_annotation?: string;
  generated_at: string;
  priority_rank?: number;
  lead_type?: string;
}

export interface CustodyLogEntry {
  log_id: number;
  evidence_id: string;
  actor_id: string;
  action: string;
  action_ts: string;
  prior_hash?: string;
  resulting_hash: string;
  ip_address?: string;
  notes?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
  risk_score?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
  properties: Record<string, unknown>;
  confidence: number;
  timestamp?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
  case_id: string;
}

export interface PipelineStatus {
  run_id: string;
  case_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  evidence_count: number;
  leads_generated: number;
  agent_results?: Record<string, unknown>;
  progress_pct: number;
}

// ─── API Client ──────────────────────────────────────

class ACPIAApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${BASE_URL}${API_PREFIX}`,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor: add JWT token
    this.client.interceptors.request.use((config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("acpia_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Response interceptor: handle 401
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("acpia_token");
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("acpia_token", token);
    }
  }

  clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("acpia_token");
    }
  }

  // ─── Cases ───────────────────────────────────────────

  async getCases(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const response = await this.client.get<{ cases: Case[]; total: number; page: number; page_size: number }>("/cases", { params });
    return response.data;
  }

  async getCase(caseId: string) {
    const response = await this.client.get<Case>(`/cases/${caseId}`);
    return response.data;
  }

  async createCase(data: {
    case_number: string;
    title: string;
    description?: string;
    jurisdiction: string;
    priority?: string;
    tags?: string[];
  }) {
    const response = await this.client.post<Case>("/cases", data);
    return response.data;
  }

  // ─── Evidence ────────────────────────────────────────

  async uploadEvidence(caseId: string, files: File[], onProgress?: (pct: number) => void) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await this.client.post<EvidenceItem[]>(`/cases/${caseId}/evidence`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return response.data;
  }

  async getEvidence(caseId: string, params?: { page?: number; mime_type?: string }) {
    const response = await this.client.get<EvidenceItem[]>(`/cases/${caseId}/evidence`, { params });
    return response.data;
  }

  async getEvidenceItem(caseId: string, evidenceId: string) {
    const response = await this.client.get<EvidenceItem>(`/cases/${caseId}/evidence/${evidenceId}`);
    return response.data;
  }

  async getCustodyLog(evidenceId: string) {
    const response = await this.client.get<{
      evidence_id: string;
      original_filename: string;
      sha256_hash: string;
      entries: CustodyLogEntry[];
      hash_integrity_verified: boolean;
      total_entries: number;
    }>(`/audit/${evidenceId}`);
    return response.data;
  }

  async triggerAnalysis(caseId: string) {
    const response = await this.client.post<{
      run_id: string;
      status: string;
      message: string;
    }>(`/cases/${caseId}/analyze`);
    return response.data;
  }

  // ─── Leads ───────────────────────────────────────────

  async getLeads(caseId: string, params?: {
    status?: string;
    agent?: string;
    min_risk_score?: number;
    page?: number;
  }) {
    const response = await this.client.get<{
      leads: Lead[];
      total: number;
      pending: number;
      confirmed: number;
      rejected: number;
    }>(`/cases/${caseId}/leads`, { params });
    return response.data;
  }

  async reviewLead(leadId: string, data: { status: string; annotation?: string }) {
    const response = await this.client.patch<Lead>(`/leads/${leadId}`, data);
    return response.data;
  }

  // ─── Knowledge Graph ──────────────────────────────────

  async getGraph(caseId: string, params?: {
    depth?: number;
    min_confidence?: number;
    node_types?: string;
  }) {
    const response = await this.client.get<GraphData>(`/cases/${caseId}/graph`, { params });
    return response.data;
  }

  // ─── Reports ─────────────────────────────────────────

  async generateReport(caseId: string) {
    const response = await this.client.get(`/cases/${caseId}/report`, {
      responseType: "blob",
    });
    return response.data;
  }
}

export const apiClient = new ACPIAApiClient();
export default apiClient;
