import type {
  AlertItem,
  AuthUser,
  Beneficiary,
  DashboardAnalytics,
  DashboardSummary,
  EvaluationMetricsSummary,
  FollowupTask,
  GuidelineCitation,
  LanguageCode,
  ReferralRecord,
  RetentionConfig,
  SavedVisitSummary,
  StructuredVisitRecord,
  UserSettings,
  VisitType,
} from '../shared/types';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  health: () =>
    apiFetch<{ status: string; geminiConfigured: boolean; languagesSupported: number }>('/api/health'),

  login: (username: string, passcode: string) =>
    apiFetch<{ user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, passcode }),
    }),

  demoSignIn: (role: 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN') =>
    apiFetch<{ user: AuthUser; token: string }>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  updateLanguage: (language: LanguageCode) =>
    apiFetch<{ preferredLanguage: LanguageCode }>('/api/auth/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    }),

  getBeneficiaries: () =>
    apiFetch<{ beneficiaries: Beneficiary[] }>('/api/beneficiaries'),

  createBeneficiary: (payload: {
    displayName: string;
    beneficiaryType: Beneficiary['beneficiaryType'];
    locality?: string;
    syntheticAddress?: string;
    dateOfBirth?: string | null;
  }) =>
    apiFetch<{ beneficiary: Beneficiary }>('/api/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDashboardSummary: () =>
    apiFetch<DashboardSummary>('/api/dashboard/summary'),

  getDashboardAnalytics: (range: '7d' | '30d' = '7d') =>
    apiFetch<DashboardAnalytics>(`/api/dashboard/analytics?range=${range}`),

  startVoiceSession: (language: LanguageCode) =>
    apiFetch<{ sessionId: string; startedAt: string; geminiConfigured: boolean }>(
      '/api/voice/session/start',
      {
        method: 'POST',
        body: JSON.stringify({ language }),
      },
    ),

  transcribeAudio: (payload: {
    base64Audio: string;
    mimeType: string;
    language: LanguageCode;
    sessionId?: string | null;
  }) =>
    apiFetch<{ transcript: string; detectedLanguage: string; latencyMs: number }>(
      '/api/voice/transcribe',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  synthesizeSpeech: (payload: {
    text: string;
    language: LanguageCode;
    urgent?: boolean;
    sessionId?: string | null;
  }) =>
    apiFetch<{
      available?: boolean;
      base64Wav: string | null;
      mimeType: string | null;
      latencyMs: number;
      reason?: string;
    }>('/api/voice/tts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  extractVisit: (payload: {
    transcript: string;
    visitType?: VisitType | null;
    language: LanguageCode;
    selectedBeneficiaryCode?: string | null;
    sessionId?: string | null;
  }) =>
    apiFetch<{
      record: StructuredVisitRecord;
      ambiguityCandidates: Beneficiary[];
      latencyMs: number;
    }>('/api/voice/extract', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  correctVisit: (record: StructuredVisitRecord, correctionText: string) =>
    apiFetch<{
      action: 'REPEAT_RECORD' | 'UPDATED_FIELD' | 'CONFIRM_SAVE' | 'NEEDS_CLARIFICATION';
      updatedField: string | null;
      updatedRecord: StructuredVisitRecord;
      spokenFeedback: string;
    }>('/api/voice/correct', {
      method: 'POST',
      body: JSON.stringify({ record, correctionText }),
    }),

  escalateEmergencyReferral: (payload: {
    beneficiaryCode?: string | null;
    transcript: string;
    visitType: VisitType;
    language: LanguageCode;
  }) =>
    apiFetch<{
      referrals: Array<{ id: string; dangerSignTitle: string; referralTimestamp: string }>;
      announcement: string;
    }>('/api/referrals/emergency', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveVisit: (payload: {
    record: StructuredVisitRecord;
    syncedFromOffline?: boolean;
    ttfaMs?: number | null;
  }) =>
    apiFetch<{
      visitId: string;
      duplicatePrevented: boolean;
      followups: FollowupTask[];
    }>('/api/visits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveVisitDraft: (record: StructuredVisitRecord) =>
    apiFetch<{ visitId: string; recordStatus: string; updated: boolean }>('/api/visits/draft', {
      method: 'POST',
      body: JSON.stringify({ record }),
    }),

  updateVisit: (
    id: string,
    payload: {
      observations?: string | null;
      nextVisitDate?: string | null;
      confirmationStatus?: StructuredVisitRecord['confirmationStatus'];
      structuredPayload?: Partial<StructuredVisitRecord>;
    },
  ) =>
    apiFetch<{ id: string; recordStatus: string; structuredPayload: StructuredVisitRecord }>(
      `/api/visits/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),

  getVisits: () => apiFetch<{ visits: SavedVisitSummary[] }>('/api/visits'),

  getFollowups: () => apiFetch<{ followups: FollowupTask[] }>('/api/followups'),

  createFollowup: (payload: {
    visitId?: string;
    beneficiaryCode?: string;
    taskDescription: string;
    priority?: string;
    dueDate?: string | null;
  }) =>
    apiFetch<{ followup: FollowupTask }>('/api/followups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateFollowup: (
    id: string,
    payload: {
      taskStatus?: 'PENDING' | 'COMPLETED';
      dueDate?: string | null;
      taskDescription?: string;
      remarks?: string;
    },
  ) =>
    apiFetch<{ id: string; taskStatus: string; dueDate: string | null }>(
      `/api/followups/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),

  completeFollowup: (id: string) =>
    apiFetch<{ id: string; taskStatus: 'COMPLETED' }>(`/api/followups/${encodeURIComponent(id)}/complete`, {
      method: 'PATCH',
    }),

  getReferrals: () => apiFetch<{ referrals: ReferralRecord[] }>('/api/referrals'),

  acknowledgeReferral: (id: string) =>
    apiFetch<{ id: string; acknowledgementStatus: string }>(
      `/api/referrals/${encodeURIComponent(id)}/acknowledge`,
      { method: 'PATCH' },
    ),

  getAlerts: () => apiFetch<{ alerts: AlertItem[]; unreadCount: number }>('/api/alerts'),

  markAlertRead: (id: string, isRead = true) =>
    apiFetch<{ id: string; isRead: boolean }>(`/api/alerts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    }),

  getSettings: () => apiFetch<{ settings: UserSettings }>('/api/settings'),

  updateSettings: (payload: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>) =>
    apiFetch<{ settings: UserSettings }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  exportReportsCsv: async (): Promise<string> => {
    const headers = new Headers();
    if (inMemoryToken) headers.set('Authorization', `Bearer ${inMemoryToken}`);
    const res = await fetch('/api/reports/export', { headers });
    if (!res.ok) throw new Error('Failed to export CSV report');
    return res.text();
  },

  getSupervisorOverview: () =>
    apiFetch<{
      totalVisits: number;
      ancVisits: number;
      newbornVisits: number;
      immunisationVisits: number;
      pendingFollowups: number;
      pendingReferrals: number;
      workerActivity: Array<{
        workerId: string;
        workerName: string;
        workerCode: string;
        assignedArea: string;
        visitsCount: number;
      }>;
    }>('/api/supervisor/overview'),

  getGuidelines: () => apiFetch<{ guidelines: GuidelineCitation[] }>('/api/guidelines'),

  getAuditLogs: () =>
    apiFetch<{
      logs: Array<{
        id: string;
        userId: string;
        userName: string;
        entityType: string;
        entityId: string;
        action: string;
        timestamp: string;
        correlationId: string;
      }>;
    }>('/api/admin/audit-logs'),

  getRetentionConfig: () => apiFetch<{ retention: RetentionConfig }>('/api/admin/retention'),

  updateRetentionConfig: (audioRetentionHours: number, transcriptRetentionDays: number) =>
    apiFetch<{ retention: RetentionConfig }>('/api/admin/retention', {
      method: 'PATCH',
      body: JSON.stringify({ audioRetentionHours, transcriptRetentionDays }),
    }),

  purgeExpiredTranscripts: () =>
    apiFetch<{ purgedCount: number; cutoffIso: string }>('/api/admin/retention/purge', {
      method: 'POST',
    }),

  getEvaluationMetrics: () => apiFetch<EvaluationMetricsSummary>('/api/metrics/evaluation'),
};

