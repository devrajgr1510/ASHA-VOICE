export type UserRole = 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN';

export type LanguageCode =
  | 'kn'
  | 'hi'
  | 'ta'
  | 'te'
  | 'ml'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'pa'
  | 'or'
  | 'as'
  | 'en';

export type VisitType = 'ANC' | 'NEWBORN' | 'IMMUNISATION';

export type VoicePipelineState =
  | 'IDLE'
  | 'LISTENING'
  | 'PAUSED'
  | 'PROCESSING'
  | 'VERIFYING'
  | 'SPEAKING'
  | 'WAITING_CONFIRMATION'
  | 'SAVING'
  | 'COMPLETED'
  | 'DANGER_ALERT';

export type ConfirmationStatus =
  | 'draft'
  | 'pending_confirmation'
  | 'confirmed'
  | 'emergency_unconfirmed';

export type DangerSignStatus =
  | 'none_detected'
  | 'positive_detected'
  | 'uncertain_pending_safety';

export type ReferralStatus =
  | 'not_required'
  | 'immediate_phc_required'
  | 'referred_acknowledged';

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  workerCode?: string;
  assignedArea?: string;
  avatarUrl?: string;
}

export interface Beneficiary {
  id: string;
  beneficiaryCode: string;
  householdId: string;
  householdCode: string;
  locality: string;
  syntheticAddress: string;
  displayName: string;
  beneficiaryType: 'PREGNANT_WOMAN' | 'NEWBORN' | 'CHILD';
  dateOfBirth: string | null;
  motherBeneficiaryCode?: string | null;
  syntheticDataFlag: boolean;
}

export interface FieldConfidenceMap {
  [fieldName: string]: number;
}

export interface PregnancyDetails {
  gestationalAgeWeeks: number | null;
  ancStatus: 'completed' | 'scheduled' | 'pending' | null;
  weightKg: number | null;
  bloodPressure: string | null;
  ifaStatus: 'reported_taking' | 'not_taking' | 'supplied' | 'unknown' | null;
  vaccinationStatus: 'reported_completed' | 'due' | 'partial' | null;
  tdDose: string | null;
  reportedSymptoms: string | null;
}

export interface NewbornDetails {
  newbornId: string | null;
  motherBeneficiaryId: string | null;
  birthDate: string | null;
  ageDays: number | null;
  birthWeightKg: number | null;
  currentWeightKg: number | null;
  feedingObservations: string | null;
  reportedTemperature: string | null;
  immunisationChecked: boolean | null;
}

export interface ImmunisationDetails {
  childAgeLabel: string | null;
  vaccinesGiven: string[];
  vaccinesDue: string[];
  missedVaccines: string[];
  previousVaccineHistory: string | null;
  scheduleVersion: string;
}

export interface CorrectionEntry {
  id?: string;
  fieldName: string;
  previousValue: string | null;
  correctedValue: string | null;
  correctionSource: 'VOICE_CORRECTION' | 'SUPERVISOR_AUDIT';
  correctedAt: string;
}

export interface DangerSignRule {
  code: string;
  category: 'PREGNANCY' | 'NEWBORN';
  title: string;
  severity: 'IMMEDIATE_PHC_REFERRAL';
  guidelineId: string;
  guidelineSection: string;
  phrases: Record<string, string[]>;
}

export interface DangerSignMatch {
  code: string;
  category: 'PREGNANCY' | 'NEWBORN';
  title: string;
  matchedPhrase: string;
  clauseText: string;
  detectionMethod: 'DETERMINISTIC_RULE_ENGINE' | 'AI_MULTILINGUAL_ASSISTED';
  confidence: number;
  guidelineId: string;
  guidelineSection: string;
  severityCategory: 'IMMEDIATE_PHC_REFERRAL';
  detectedAt: string;
}

export interface DangerSignAnalysis {
  status: DangerSignStatus;
  matches: DangerSignMatch[];
  negatedMatches: Array<{
    code: string;
    title: string;
    clauseText: string;
    negationCue: string;
  }>;
  uncertainMatches: Array<{
    code: string;
    title: string;
    clauseText: string;
    clarificationPrompt: string;
  }>;
  analyzedAt: string;
}

export interface StructuredVisitRecord {
  clientRequestId: string;
  beneficiaryId: string | null;
  beneficiaryName: string | null;
  householdId: string | null;
  workerId: string;
  visitType: VisitType;
  visitDate: string;
  language: LanguageCode;
  detectedLanguages: string[];
  observations: string | null;
  pregnancyDetails: PregnancyDetails | null;
  newbornDetails: NewbornDetails | null;
  immunisationDetails: ImmunisationDetails | null;
  nextVisitDate: string | null;
  dangerSignStatus: DangerSignStatus;
  dangerAnalysis: DangerSignAnalysis;
  referralStatus: ReferralStatus;
  confirmationStatus: ConfirmationStatus;
  sourceTranscript: string;
  extractionSource: 'GEMINI_STRUCTURED_AI' | 'OFFLINE_DETERMINISTIC_PARSER';
  fieldConfidence: FieldConfidenceMap;
  originalUtterances: Record<string, string>;
  correctionHistory: CorrectionEntry[];
}

export interface FollowupTask {
  id: string;
  visitId: string;
  beneficiaryId: string;
  beneficiaryName?: string;
  beneficiaryCode?: string;
  taskDescription: string;
  priority:
    | 'IMMEDIATE_REFERRAL'
    | 'HIGH_PRIORITY_REFERRAL'
    | 'SCHEDULED_VISIT'
    | 'PENDING_INFORMATION'
    | 'ROUTINE_FOLLOWUP';
  dueDate: string | null;
  taskStatus: 'PENDING' | 'COMPLETED';
  createdAt: string;
}

export interface GuidelineCitation {
  id: string;
  guidelineName: string;
  sourceUrl: string;
  pageOrSection: string;
  version: string;
  effectiveDate: string;
  reviewedBy: string;
  reviewedAt: string;
  activeStatus: boolean;
}

export interface SavedVisitSummary {
  id: string;
  beneficiaryId: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  householdCode?: string;
  locality?: string;
  workerId: string;
  workerName: string;
  visitType: VisitType;
  visitDate: string;
  language: LanguageCode;
  recordStatus: 'SAVED' | 'SYNCED_FROM_OFFLINE' | 'EMERGENCY_REFERRAL';
  confirmationStatus: ConfirmationStatus;
  dangerSignStatus: DangerSignStatus;
  referralStatus: ReferralStatus;
  nextVisitDate: string | null;
  structuredPayload: StructuredVisitRecord;
  rawTranscript: string;
  createdAt: string;
}

export interface RetentionConfig {
  audioRetentionHours: number;
  transcriptRetentionDays: number;
  externalProviderDisclosure: string;
  updatedBy: string;
  updatedAt: string;
}

export interface ReferralRecord {
  id: string;
  visitId: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  workerName: string;
  dangerSignCode: string;
  dangerSignTitle: string;
  matchedPhrase: string;
  sourceGuidelineId: string;
  referralDestinationType: 'PHC';
  referralStatus: 'IMMEDIATE_ACTION_REQUIRED' | 'ACKNOWLEDGED';
  acknowledgementStatus: 'PENDING' | 'ACKNOWLEDGED_BY_PHC';
  referralTimestamp: string;
}

export interface EvaluationMetricsSummary {
  totalSamples: number;
  completedVisits: number;
  voiceSessionsCount: number;
  avgTimeToFirstAudioMs: number | null;
  p50TimeToFirstAudioMs: number | null;
  p95TimeToFirstAudioMs: number | null;
  dangerSignEventsCount: number;
  correctionsCount: number;
  offlineSyncedCount: number;
  supportedLanguagesCount: number;
  providerName: string;
  knownLimitations: string[];
}

export interface UserSettings {
  userId: string;
  preferredLanguage: LanguageCode;
  voiceSpeed: number;
  highContrast: boolean;
  largeText: boolean;
  offlineAutoSync: boolean;
  notificationsEnabled: boolean;
  updatedAt: string;
}

export interface AlertItem {
  id: string;
  sourceType: 'REFERRAL' | 'FOLLOWUP' | 'SAFETY';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  beneficiaryCode: string | null;
  beneficiaryName: string | null;
  visitId: string | null;
  acknowledgementStatus: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  visitsCompleted: number;
  ancCount: number;
  newbornCount: number;
  immunisationCount: number;
  pendingFollowups: number;
  completedFollowups: number;
  alertEvents: number;
  pendingReferrals: number;
  recordCompletionRate: number;
  todayVisits: number;
  recentVisits: SavedVisitSummary[];
  upcomingFollowups: FollowupTask[];
  recentAlerts: AlertItem[];
}

export interface AnalyticsBucket {
  date: string;
  label: string;
  ANC: number;
  NEWBORN: number;
  IMMUNISATION: number;
  total: number;
}

export interface DashboardAnalytics {
  range: '7d' | '30d';
  buckets: AnalyticsBucket[];
  completionRate: number;
  dangerSignRate: number;
  totalInRange: number;
}

export interface TranscriptProvenanceSpan {
  fieldName: string;
  label: string;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface AcousticTelemetry {
  rmsDb: number;
  snrEstimateDb: number;
  noiseFloorDb: number;
  noiseEnvironment: 'Quiet' | 'Moderate' | 'Noisy Household';
  vadActive: boolean;
  peakHz: number;
}

