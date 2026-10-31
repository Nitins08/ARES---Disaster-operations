export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type IncidentStatus = "new" | "needs_information" | "verified" | "assigned" | "resolved" | "duplicate" | "false_report";
export type UserRole = "responder" | "coordinator";

export interface BoundingBox {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  label: string;
}

export interface Report {
  id: number;
  tracking_token: string;
  image_url?: string;
  image_phash?: string;
  raw_description?: string;
  detected_language: string;
  english_translation?: string;
  latitude?: number;
  longitude?: number;
  is_gps: boolean;
  is_reporting_for_other: boolean;
  status: string;
  is_unverified: boolean;
  follow_up_needed: string[];
  consistency_note?: string;
  incident_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: number;
  disaster_type: string;
  priority_level: PriorityLevel;
  priority_score: number;
  confidence_level: ConfidenceLevel;
  confidence_score: number;
  why_this_rank: string;
  what_happened?: string;
  report_source?: string;
  verification_status?: string;
  latitude: number;
  longitude: number;
  address_summary?: string;
  people_at_risk: number;
  urgent_needs: string[];
  visible_hazards: string[];
  danger_phrases: string[];
  evidence_boxes: BoundingBox[];
  primary_image_url?: string;
  corroboration_count: number;
  merge_reasons: string[];
  status: IncidentStatus;
  assigned_team?: string;
  coordinator_notes?: string;
  created_at: string;
  updated_at: string;
  reports: Report[];
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor_role: string;
  actor_id: string;
  action: string;
  incident_id: number;
  details: Record<string, any>;
}

export interface TrackingResponse {
  tracking_token: string;
  report_id: number;
  incident_id?: number;
  status: string;
  is_unverified: boolean;
  follow_up_needed: string[];
  message: string;
  created_at: string;
  priority_level?: PriorityLevel;
  why_this_rank?: string;
}
