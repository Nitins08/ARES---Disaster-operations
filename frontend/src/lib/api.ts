import { Incident, Report, AuditLog, TrackingResponse } from '../types';
import { getAdminToken, removeAdminSession } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleAuthResponse(resp: Response) {
  if (resp.status === 401) {
    removeAdminSession();
    window.dispatchEvent(new CustomEvent('ares:unauthorized'));
    throw new Error('Unauthorized: Administrative session expired or required.');
  }
}

// --- PUBLIC CITIZEN ENDPOINTS (NO AUTHENTICATION REQUIRED) ---

export async function submitReport(formData: FormData): Promise<Report> {
  const resp = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    body: formData,
  });
  if (!resp.ok) {
    throw new Error(`Report submission failed: ${resp.statusText}`);
  }
  return resp.json();
}

export async function getReportTracking(token: string): Promise<TrackingResponse> {
  const resp = await fetch(`${API_BASE}/reports/r/${token}`);
  if (!resp.ok) {
    throw new Error('Failed to retrieve tracking info');
  }
  return resp.json();
}

export async function submitFollowUp(token: string, formData: FormData): Promise<any> {
  const resp = await fetch(`${API_BASE}/reports/r/${token}/follow-up`, {
    method: 'POST',
    body: formData,
  });
  if (!resp.ok) {
    throw new Error('Follow-up submission failed');
  }
  return resp.json();
}

// --- PROTECTED ADMINISTRATIVE ENDPOINTS (REQUIRES ADMIN AUTHENTICATION) ---

export async function getIncidents(params?: {
  status?: string;
  disaster_type?: string;
  priority_level?: string;
  confidence_level?: string;
}): Promise<Incident[]> {
  const url = new URL(`${window.location.origin}${API_BASE}/incidents`);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val && val !== 'all') url.searchParams.append(key, val);
    });
  }
  const resp = await fetch(url.toString(), {
    headers: { ...getAuthHeaders() }
  });
  handleAuthResponse(resp);
  if (!resp.ok) {
    throw new Error('Failed to fetch incidents queue');
  }
  return resp.json();
}

export async function getIncident(id: number): Promise<Incident> {
  const resp = await fetch(`${API_BASE}/incidents/${id}`, {
    headers: { ...getAuthHeaders() }
  });
  handleAuthResponse(resp);
  if (!resp.ok) {
    throw new Error('Failed to fetch incident details');
  }
  return resp.json();
}

export async function updateIncident(
  id: number,
  payload: {
    status?: string;
    corrected_severity?: number;
    corrected_hazard?: string;
    assigned_team?: string;
    coordinator_notes?: string;
    actor_role?: string;
    actor_id?: string;
  }
): Promise<Incident> {
  const resp = await fetch(`${API_BASE}/incidents/${id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders() 
    },
    body: JSON.stringify(payload),
  });
  handleAuthResponse(resp);
  if (!resp.ok) {
    throw new Error('Failed to update incident');
  }
  return resp.json();
}

export async function mergeIncidents(payload: {
  target_incident_id: number;
  source_incident_id: number;
  reason: string;
  actor_role: string;
  actor_id: string;
}): Promise<Incident> {
  const resp = await fetch(`${API_BASE}/incidents/merge`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders() 
    },
    body: JSON.stringify(payload),
  });
  handleAuthResponse(resp);
  if (!resp.ok) {
    throw new Error('Failed to merge incidents');
  }
  return resp.json();
}

export async function getAuditLogs(incidentId?: number): Promise<AuditLog[]> {
  const url = incidentId
    ? `${API_BASE}/audit-logs?incident_id=${incidentId}`
    : `${API_BASE}/audit-logs`;
  const resp = await fetch(url, {
    headers: { ...getAuthHeaders() }
  });
  handleAuthResponse(resp);
  if (!resp.ok) {
    throw new Error('Failed to fetch audit logs');
  }
  return resp.json();
}

export async function getRules(): Promise<any> {
  const resp = await fetch(`${API_BASE}/rules`, {
    headers: { ...getAuthHeaders() }
  });
  handleAuthResponse(resp);
  if (!resp.ok) {
    throw new Error('Failed to fetch rules');
  }
  return resp.json();
}

export async function seedDemoData(): Promise<any> {
  const resp = await fetch(`${API_BASE}/seed`, { 
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  handleAuthResponse(resp);
  if (!resp.ok) {
    throw new Error('Failed to seed demo data');
  }
  return resp.json();
}
