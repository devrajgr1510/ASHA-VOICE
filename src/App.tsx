import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  LayoutDashboard,
  Mic,
} from 'lucide-react';
import { AlertsCenterPage } from './components/AlertsCenterPage';
import { AuthScreen } from './components/AuthScreen';
import { DangerAlertScreen } from './components/DangerAlertScreen';
import { DashboardHome } from './components/DashboardHome';
import { HelpSupportPage } from './components/HelpSupportPage';
import { HistoryAndFollowupsView } from './components/HistoryAndFollowupsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ReportsAnalyticsPage } from './components/ReportsAnalyticsPage';
import { SettingsPage } from './components/SettingsPage';
import { SidebarNav, type NavSection } from './components/SidebarNav';
import { StructuredRecordCard } from './components/StructuredRecordCard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { TopHeaderBar } from './components/TopHeaderBar';
import { VoiceCapturePanel } from './components/VoiceCapturePanel';
import { WhatToAskPage } from './components/WhatToAskPage';
import { WhatToFillPage } from './components/WhatToFillPage';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { useVoicePipeline } from './hooks/useVoicePipeline';
import { buildReadBackScript } from './shared/clinicalEngine';
import { getLanguageConfig } from './shared/languages';
import type {
  AlertItem,
  AnalyticsBucket,
  AuthUser,
  Beneficiary,
  DangerSignAnalysis,
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
} from './shared/types';
import { api, setAuthToken } from './utils/apiClient';
import {
  getOfflineVisitDrafts,
  markOfflineDangerAlertDelivered,
  removeOfflineVisitDraft,
  saveOfflineDangerAlert,
  saveOfflineVisitDraft,
  type OfflineVisitDraft,
} from './utils/offlineQueue';

const DEFAULT_SETTINGS: UserSettings = {
  userId: '',
  preferredLanguage: 'en',
  voiceSpeed: 1.0,
  highContrast: false,
  largeText: false,
  offlineAutoSync: true,
  notificationsEnabled: true,
  updatedAt: '',
};

export default function App() {
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [activeSection, setActiveSection] = useState<NavSection>('DASHBOARD');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visitType, setVisitType] = useState<VisitType>('ANC');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);

  const [visits, setVisits] = useState<SavedVisitSummary[]>([]);
  const [followups, setFollowups] = useState<FollowupTask[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d'>('7d');
  const [analyticsBuckets, setAnalyticsBuckets] = useState<AnalyticsBucket[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const [guidelines, setGuidelines] = useState<GuidelineCitation[]>([]);
  const [metrics, setMetrics] = useState<EvaluationMetricsSummary | null>(null);
  const [retentionConfig, setRetentionConfig] = useState<RetentionConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<
    Array<{
      id: string;
      userId: string;
      userName: string;
      entityType: string;
      entityId: string;
      action: string;
      timestamp: string;
      correlationId: string;
    }>
  >([]);
  const [supervisorOverview, setSupervisorOverview] = useState<{
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
  } | null>(null);

  const [offlineDrafts, setOfflineDrafts] = useState<OfflineVisitDraft[]>(() =>
    getOfflineVisitDrafts(),
  );
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [savedBanner, setSavedBanner] = useState<{
    message: string;
    followups: FollowupTask[];
  } | null>(null);

  const [activeEmergency, setActiveEmergency] = useState<{
    analysis: DangerSignAnalysis;
    transcript: string;
    persistedOfflineOnly: boolean;
  } | null>(null);

  // Apply Accessibility DOM root classes cleanly
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', Boolean(settings.largeText));
    root.classList.toggle('high-contrast', Boolean(settings.highContrast));
  }, [settings.highContrast, settings.largeText]);

  const loadAnalytics = useCallback(async (range: '7d' | '30d') => {
    try {
      const res = await api.getDashboardAnalytics(range);
      setAnalyticsBuckets(res.buckets);
    } catch {
      // Non-blocking
    }
  }, []);

  const loadWorkspaceData = useCallback(
    async (currentUser: AuthUser, targetRange: '7d' | '30d' = '7d') => {
      try {
        const [benRes, visRes, fuRes, refRes, dashRes, anaRes, alertRes, setRes] = await Promise.all([
          api.getBeneficiaries(),
          api.getVisits(),
          api.getFollowups(),
          api.getReferrals(),
          api.getDashboardSummary(),
          api.getDashboardAnalytics(targetRange),
          api.getAlerts(),
          api.getSettings(),
        ]);
        setBeneficiaries(benRes.beneficiaries);
        setVisits(visRes.visits);
        setFollowups(fuRes.followups);
        setReferrals(refRes.referrals);
        setDashboardSummary(dashRes);
        setAnalyticsBuckets(anaRes.buckets);
        setAlerts(alertRes.alerts);
        setSettings(setRes.settings);

        if (currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN') {
          const [ovRes, guideRes, metRes, audRes, retRes] = await Promise.all([
            api.getSupervisorOverview(),
            api.getGuidelines(),
            api.getEvaluationMetrics(),
            api.getAuditLogs(),
            api.getRetentionConfig(),
          ]);
          setSupervisorOverview(ovRes);
          setGuidelines(guideRes.guidelines);
          setMetrics(metRes);
          setAuditLogs(audRes.logs);
          setRetentionConfig(retRes.retention);
        }
      } catch (err) {
        console.error('Failed to load workspace data:', err);
      }
    },
    [],
  );

  const hasAutostartedRef = useRef(false);

  // ?autostart=1 support for direct testing (runs once on initial mount)
  useEffect(() => {
    if (hasAutostartedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !user) {
      hasAutostartedRef.current = true;
      void api
        .demoSignIn('ASHA_WORKER')
        .then((res) => {
          setAuthToken(res.token);
          setUser(res.user);
          setLanguage(res.user.preferredLanguage);
          setActiveSection('DASHBOARD');
          return loadWorkspaceData(res.user);
        })
        .catch(() => undefined);
    }
  }, [loadWorkspaceData, user]);

  const handleEmergencyDetected = useCallback(
    async (analysis: DangerSignAnalysis, transcript: string) => {
      const alertId = `alert-${Date.now()}`;
      saveOfflineDangerAlert({
        id: alertId,
        beneficiaryCode: selectedBeneficiary?.beneficiaryCode ?? null,
        beneficiaryName: selectedBeneficiary?.displayName ?? null,
        transcript,
        analysis,
        detectedAt: analysis.analyzedAt,
        deliveryStatus: 'LOCAL_ONLY_OFFLINE',
      });

      let persistedOfflineOnly = !isOnline;
      if (isOnline) {
        try {
          await api.escalateEmergencyReferral({
            beneficiaryCode: selectedBeneficiary?.beneficiaryCode ?? null,
            transcript,
            visitType,
            language,
          });
          markOfflineDangerAlertDelivered(alertId);
          persistedOfflineOnly = false;
          if (user) void loadWorkspaceData(user, analyticsRange);
        } catch {
          persistedOfflineOnly = true;
        }
      }

      setActiveEmergency({
        analysis,
        transcript,
        persistedOfflineOnly,
      });
    },
    [analyticsRange, isOnline, language, loadWorkspaceData, selectedBeneficiary, user, visitType],
  );

  const voice = useVoicePipeline({
    language,
    visitType,
    workerId: user?.workerCode ?? 'WORKER001',
    beneficiaries,
    selectedBeneficiary,
    isOnline,
    voiceSpeed: settings.voiceSpeed,
    onEmergencyDetected: (analysis, transcript) => {
      void handleEmergencyDetected(analysis, transcript);
    },
  });

  const handleSyncOfflineDrafts = useCallback(async () => {
    if (!isOnline || offlineDrafts.length === 0 || !settings.offlineAutoSync) return;
    setIsSyncingOffline(true);
    try {
      for (const draft of offlineDrafts) {
        try {
          await api.saveVisit({
            record: draft.record,
            syncedFromOffline: true,
          });
          const updated = removeOfflineVisitDraft(draft.record.clientRequestId);
          setOfflineDrafts(updated);
        } catch {
          // Retain draft safely
        }
      }
      if (user) await loadWorkspaceData(user, analyticsRange);
    } finally {
      setIsSyncingOffline(false);
    }
  }, [analyticsRange, isOnline, loadWorkspaceData, offlineDrafts, settings.offlineAutoSync, user]);

  useEffect(() => {
    if (isOnline && user && offlineDrafts.length > 0 && settings.offlineAutoSync) {
      void handleSyncOfflineDrafts();
    }
  }, [handleSyncOfflineDrafts, isOnline, offlineDrafts.length, settings.offlineAutoSync, user]);

  const handleAuthenticated = (authUser: AuthUser) => {
    setUser(authUser);
    setLanguage(authUser.preferredLanguage);
    setActiveSection(authUser.role === 'ASHA_WORKER' ? 'DASHBOARD' : 'SUPERVISOR');
    void loadWorkspaceData(authUser);
  };

  const handleSignOut = () => {
    voice.resetPipeline();
    setAuthToken(null);
    setUser(null);
    setSavedBanner(null);
    setActiveEmergency(null);
    setSettings(DEFAULT_SETTINGS);
  };

  const handleChangeLanguage = async (nextLang: LanguageCode) => {
    setLanguage(nextLang);
    setSettings((prev) => ({ ...prev, preferredLanguage: nextLang }));
    if (user && isOnline) {
      await api.updateLanguage(nextLang).catch(() => undefined);
    }
  };

  const handleConfirmAndSave = async (recordOverride?: StructuredVisitRecord) => {
    const target = recordOverride ?? voice.structuredRecord;
    if (!target) return;
    setIsSavingVisit(true);
    voice.setPipelineState('SAVING');

    const confirmedRecord: StructuredVisitRecord = {
      ...target,
      confirmationStatus: 'confirmed',
    };

    if (!isOnline) {
      const updatedQueue = saveOfflineVisitDraft(confirmedRecord);
      setOfflineDrafts(updatedQueue);
      setIsSavingVisit(false);
      voice.setPipelineState('COMPLETED');
      setSavedBanner({
        message: 'Saved locally in offline draft queue. Will sync automatically when internet returns.',
        followups: [],
      });
      return;
    }

    try {
      const res = await api.saveVisit({
        record: confirmedRecord,
        ttfaMs: voice.ttfaMs,
      });
      voice.setPipelineState('COMPLETED');
      setSavedBanner({
        message: `Visit saved for ${confirmedRecord.beneficiaryName} (${confirmedRecord.beneficiaryId})`,
        followups: res.followups,
      });
      await voice.speakText(
        `Visit saved for ${confirmedRecord.beneficiaryName}. Follow-up tasks have been created.`,
        false,
        'COMPLETED',
      );
      if (user) await loadWorkspaceData(user, analyticsRange);
    } catch {
      const updatedQueue = saveOfflineVisitDraft(confirmedRecord);
      setOfflineDrafts(updatedQueue);
      voice.setPipelineState('COMPLETED');
      setSavedBanner({
        message: 'Network interruption detected. Visit preserved safely in offline draft queue.',
        followups: [],
      });
    } finally {
      setIsSavingVisit(false);
    }
  };

  const handleSaveDraft = async (recordOverride?: StructuredVisitRecord) => {
    const target = recordOverride ?? voice.structuredRecord;
    if (!target) return;
    if (!isOnline) {
      const updatedQueue = saveOfflineVisitDraft({ ...target, confirmationStatus: 'draft' });
      setOfflineDrafts(updatedQueue);
      setSavedBanner({ message: 'Draft saved locally offline.', followups: [] });
      return;
    }
    await api.saveVisitDraft(target);
    setSavedBanner({ message: 'Draft visit saved to register.', followups: [] });
    if (user) await loadWorkspaceData(user, analyticsRange);
  };

  const handleQuickCorrection = async (correctionText: string) => {
    if (!voice.structuredRecord) return;
    voice.setPipelineState('PROCESSING');
    try {
      const outcome = isOnline
        ? await api.correctVisit(voice.structuredRecord, correctionText)
        : null;
      if (outcome) {
        voice.setStructuredRecord(outcome.updatedRecord);
        if (outcome.updatedField) voice.setHighlightedField(outcome.updatedField);
        await voice.speakText(outcome.spokenFeedback, false, 'WAITING_CONFIRMATION');
      }
    } catch {
      voice.setPipelineState('WAITING_CONFIRMATION');
    }
  };

  const handleRunJudgeScenario = async (
    transcript: string,
    targetVisitType?: VisitType,
    benCode?: string | null,
  ) => {
    setSavedBanner(null);
    if (targetVisitType) setVisitType(targetVisitType);
    const ben = benCode
      ? beneficiaries.find((b) => b.beneficiaryCode === benCode) ?? null
      : null;
    if (benCode) {
      setSelectedBeneficiary(ben);
    }
    setActiveSection('VISIT');
    await voice.processTranscript(transcript, targetVisitType, ben);
  };

  const handleConfirmUncertainSafety = async (isDangerPresent: boolean) => {
    if (!voice.structuredRecord) return;
    if (isDangerPresent) {
      const forcedAnalysis: DangerSignAnalysis = {
        ...voice.structuredRecord.dangerAnalysis,
        status: 'positive_detected',
        matches: voice.structuredRecord.dangerAnalysis.uncertainMatches.map((u) => ({
          code: u.code,
          category: voice.structuredRecord!.visitType === 'NEWBORN' ? 'NEWBORN' : 'PREGNANCY',
          title: u.title,
          matchedPhrase: u.clauseText,
          clauseText: u.clauseText,
          detectionMethod: 'DETERMINISTIC_RULE_ENGINE',
          confidence: 1,
          guidelineId: 'NHM_ASHA_MOD6',
          guidelineSection: 'Worker Confirmed Uncertain Symptom',
          severityCategory: 'IMMEDIATE_PHC_REFERRAL',
          detectedAt: new Date().toISOString(),
        })),
      };
      await handleEmergencyDetected(forcedAnalysis, voice.structuredRecord.sourceTranscript);
    } else {
      voice.setStructuredRecord({
        ...voice.structuredRecord,
        dangerSignStatus: 'none_detected',
        dangerAnalysis: {
          ...voice.structuredRecord.dangerAnalysis,
          status: 'none_detected',
          uncertainMatches: [],
        },
      });
    }
  };

  const handleExportCsv = async () => {
    const csv = await api.exportReportsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asha-visit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <AuthScreen
        selectedLanguage={language}
        onSelectLanguage={setLanguage}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const langCfg = getLanguageConfig(language);
  const isSupervisorOrAdmin = user.role === 'SUPERVISOR' || user.role === 'ADMIN';
  const pendingFollowupCount = followups.filter((f) => f.taskStatus === 'PENDING').length;
  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#F7F9FC] text-[#172B3A]">
      {/* Fixed Collapsible Left Sidebar + Mobile Drawer */}
      <SidebarNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        user={user}
        unreadAlertsCount={unreadAlertsCount}
        pendingFollowupsCount={pendingFollowupCount}
        onSignOut={handleSignOut}
      />

      {/* Right Main Column */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-8">
        <TopHeaderBar
          user={user}
          language={language}
          onChangeLanguage={(l) => void handleChangeLanguage(l)}
          isOnline={isOnline}
          pendingOfflineCount={offlineDrafts.length}
          alerts={alerts}
          onMarkAlertRead={(id) => {
            void api.markAlertRead(id, true).then(() => {
              setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
            });
          }}
          onNavigate={setActiveSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSignOut={handleSignOut}
        />

        <main id="main-content" className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {/* Saved Visit & Auto Follow-Up Confirmation Banner */}
          {savedBanner && (activeSection === 'VISIT' || activeSection === 'WHAT_TO_FILL') && (
            <div
              role="status"
              className="mb-6 rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1] p-5 text-[#064E3B]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-[#10A77A]" aria-hidden="true" />
                  <span>VISIT SAVED · {savedBanner.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSavedBanner(null);
                    voice.resetPipeline();
                  }}
                  className="min-h-[40px] rounded-xl bg-[#087F75] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#066860]"
                >
                  Start Next Visit
                </button>
              </div>
              {savedBanner.followups.length > 0 && (
                <div className="mt-3 border-t border-[#A7F3D0] pt-3">
                  <div className="text-xs font-bold text-[#087F75]">NEXT ACTIONS GENERATED:</div>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs">
                    {savedBanner.followups.map((f) => (
                      <li key={f.id}>
                        {f.taskDescription}
                        {f.dueDate ? ` (Due ${f.dueDate})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeSection === 'DASHBOARD' && (
            <DashboardHome
              summary={dashboardSummary}
              analyticsRange={analyticsRange}
              analyticsBuckets={analyticsBuckets}
              onChangeAnalyticsRange={(r) => {
                setAnalyticsRange(r);
                void loadAnalytics(r);
              }}
              visits={visits}
              followups={followups}
              alerts={alerts}
              activeRecord={voice.structuredRecord}
              activeTranscript={voice.liveTranscript || voice.partialTranscript}
              onStartVoiceVisit={(vt) => {
                if (vt) setVisitType(vt);
                setActiveSection('VISIT');
              }}
              onNavigate={setActiveSection}
              onCompleteFollowup={(id) => {
                void api.completeFollowup(id).then(() => {
                  if (user) void loadWorkspaceData(user, analyticsRange);
                });
              }}
            />
          )}

          {activeSection === 'VISIT' && (
            <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
              <div className="lg:col-span-6">
                <VoiceCapturePanel
                  language={language}
                  visitType={visitType}
                  onChangeVisitType={setVisitType}
                  beneficiaries={beneficiaries}
                  selectedBeneficiary={selectedBeneficiary}
                  onSelectBeneficiary={(ben) => {
                    setSelectedBeneficiary(ben);
                    voice.setAmbiguityCandidates([]);
                    if (ben && voice.structuredRecord) {
                      voice.setStructuredRecord({
                        ...voice.structuredRecord,
                        beneficiaryId: ben.beneficiaryCode,
                        beneficiaryName: ben.displayName,
                        householdId: ben.householdCode,
                      });
                    }
                  }}
                  onCreateBeneficiary={async (payload) => {
                    const res = await api.createBeneficiary(payload);
                    setBeneficiaries((prev) => [...prev, res.beneficiary]);
                    return res.beneficiary;
                  }}
                  ambiguityCandidates={voice.ambiguityCandidates}
                  pipelineState={voice.pipelineState}
                  waveformBars={voice.waveformBars}
                  acousticTelemetry={voice.acousticTelemetry}
                  recordingSeconds={voice.recordingSeconds}
                  liveTranscript={voice.liveTranscript}
                  partialTranscript={voice.partialTranscript}
                  fieldProvenance={voice.fieldProvenance}
                  highlightedField={voice.highlightedField}
                  onHoverField={voice.setHighlightedField}
                  structuredRecord={voice.structuredRecord}
                  noiseWarning={voice.noiseWarning}
                  micError={voice.micError}
                  providerStatus={voice.providerStatus}
                  ttfaMs={voice.ttfaMs}
                  isOnline={isOnline}
                  onStartListening={() => void voice.startListening(false)}
                  onPauseListening={voice.pauseListening}
                  onResumeListening={voice.resumeListening}
                  onStopListening={() => void voice.stopListening()}
                  onCancelListening={voice.cancelListening}
                  onBargeIn={() => void voice.bargeInInterrupt()}
                  onRunJudgeScenario={(txt, vt, bc) => void handleRunJudgeScenario(txt, vt, bc)}
                />
              </div>

              <div className="lg:col-span-6">
                <StructuredRecordCard
                  record={voice.structuredRecord}
                  pipelineState={voice.pipelineState}
                  language={language}
                  isSaving={isSavingVisit}
                  highlightedField={voice.highlightedField}
                  onHoverField={voice.setHighlightedField}
                  onListenAgain={() => {
                    if (voice.structuredRecord) {
                      void voice.speakText(
                        buildReadBackScript(voice.structuredRecord, language),
                        false,
                        'WAITING_CONFIRMATION',
                      );
                    }
                  }}
                  onInterruptPlayback={() => void voice.bargeInInterrupt()}
                  onStartVoiceCorrection={() => void voice.startListening(true)}
                  onQuickVoiceCorrection={(txt) => void handleQuickCorrection(txt)}
                  onSaveDraft={() => void handleSaveDraft()}
                  onOpenFullForm={() => setActiveSection('WHAT_TO_FILL')}
                  onConfirmAndSave={() => void handleConfirmAndSave()}
                  onConfirmUncertainSafety={(danger) => void handleConfirmUncertainSafety(danger)}
                />
              </div>
            </div>
          )}

          {activeSection === 'WHAT_TO_ASK' && (
            <WhatToAskPage
              activeVisitType={visitType}
              onChangeVisitType={setVisitType}
              activeRecord={voice.structuredRecord}
              activeTranscript={voice.liveTranscript || voice.partialTranscript}
              onSpeakPrompt={(txt) => void voice.speakText(txt, false, 'IDLE')}
              onStartVoiceForCategory={(vt) => {
                setVisitType(vt);
                setActiveSection('VISIT');
              }}
            />
          )}

          {activeSection === 'WHAT_TO_FILL' && (
            <WhatToFillPage
              record={voice.structuredRecord}
              beneficiaries={beneficiaries}
              language={language}
              workerId={user.workerCode ?? 'WORKER001'}
              isSaving={isSavingVisit}
              onUpdateRecord={voice.setStructuredRecord}
              onSaveDraft={handleSaveDraft}
              onConfirmAndSave={handleConfirmAndSave}
              onListenReadBack={(rec) => {
                void voice.speakText(buildReadBackScript(rec, language), false, 'IDLE');
              }}
              onOpenVoiceVisit={() => setActiveSection('VISIT')}
            />
          )}

          {(activeSection === 'HISTORY' || activeSection === 'FOLLOWUPS') && (
            <HistoryAndFollowupsView
              activeSection={activeSection}
              visits={visits}
              followups={followups}
              referrals={referrals}
              beneficiaries={beneficiaries}
              onCompleteFollowup={(id) => {
                void api.completeFollowup(id).then(() => {
                  if (user) void loadWorkspaceData(user, analyticsRange);
                });
              }}
              onRescheduleFollowup={async (id, dueDate) => {
                await api.updateFollowup(id, { dueDate });
                if (user) await loadWorkspaceData(user, analyticsRange);
              }}
              onCreateFollowup={async (payload) => {
                await api.createFollowup(payload);
                if (user) await loadWorkspaceData(user, analyticsRange);
              }}
              onUpdateVisit={async (visitId, payload) => {
                await api.updateVisit(visitId, payload);
                if (user) await loadWorkspaceData(user, analyticsRange);
              }}
              onExportCsv={handleExportCsv}
            />
          )}

          {activeSection === 'ALERTS' && (
            <AlertsCenterPage
              alerts={alerts}
              referrals={referrals}
              userRole={user.role}
              onMarkAlertRead={(id) => {
                void api.markAlertRead(id, true).then(() => {
                  setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
                });
              }}
              onAcknowledgeReferral={(id) => {
                void api.acknowledgeReferral(id).then(() => {
                  if (user) void loadWorkspaceData(user, analyticsRange);
                });
              }}
            />
          )}

          {activeSection === 'REPORTS' && (
            <ReportsAnalyticsPage
              visits={visits}
              analyticsRange={analyticsRange}
              analyticsBuckets={analyticsBuckets}
              onChangeRange={(r) => {
                setAnalyticsRange(r);
                void loadAnalytics(r);
              }}
              onExportCsv={handleExportCsv}
            />
          )}

          {activeSection === 'SETTINGS' && (
            <SettingsPage
              user={user}
              settings={settings}
              onSaveSettings={async (patch) => {
                const res = await api.updateSettings(patch);
                setSettings(res.settings);
                if (patch.preferredLanguage) setLanguage(patch.preferredLanguage);
              }}
              onTestVoiceSpeed={() => {
                void voice.speakText(
                  'Sample voice read-back speed check for ASHA Voice Field Register.',
                  false,
                  'IDLE',
                );
              }}
            />
          )}

          {activeSection === 'HELP' && (
            <HelpSupportPage
              onLaunchScenario={(txt, vt, bc) => void handleRunJudgeScenario(txt, vt, bc)}
            />
          )}

          {activeSection === 'SUPERVISOR' && isSupervisorOrAdmin && (
            <SupervisorDashboard
              overview={supervisorOverview}
              visits={visits}
              referrals={referrals}
              guidelines={guidelines}
              metrics={metrics}
              retentionConfig={retentionConfig}
              auditLogs={auditLogs}
              onAcknowledgeReferral={(id) => {
                void api.acknowledgeReferral(id).then(() => {
                  if (user) void loadWorkspaceData(user, analyticsRange);
                });
              }}
              onUpdateRetention={async (hours, days) => {
                const res = await api.updateRetentionConfig(hours, days);
                setRetentionConfig(res.retention);
                if (user) void loadWorkspaceData(user, analyticsRange);
              }}
              onPurgeTranscripts={async () => {
                const res = await api.purgeExpiredTranscripts();
                if (user) void loadWorkspaceData(user, analyticsRange);
                return res;
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Quick Thumb-Zone Bar */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 grid h-16 grid-cols-4 border-t border-[#E7EDF2] bg-white/95 backdrop-blur-md lg:hidden"
      >
        <button
          type="button"
          onClick={() => setActiveSection('DASHBOARD')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            activeSection === 'DASHBOARD' ? 'text-[#087F75]' : 'text-[#718096]'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('VISIT')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            activeSection === 'VISIT' ? 'text-[#10A77A]' : 'text-[#718096]'
          }`}
        >
          <Mic className="h-5 w-5" aria-hidden="true" />
          <span>Voice</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('FOLLOWUPS')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            activeSection === 'FOLLOWUPS' ? 'text-[#087F75]' : 'text-[#718096]'
          }`}
        >
          <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
          <span>Follow-ups</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('ALERTS')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            activeSection === 'ALERTS'
              ? 'text-[#D94B4B]'
              : unreadAlertsCount > 0
                ? 'text-[#D94B4B]'
                : 'text-[#718096]'
          }`}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span>Alerts ({unreadAlertsCount})</span>
        </button>
      </nav>

      {/* Emergency Danger-Sign Overlay */}
      {activeEmergency && (
        <DangerAlertScreen
          analysis={activeEmergency.analysis}
          beneficiaryName={
            voice.structuredRecord?.beneficiaryName ?? selectedBeneficiary?.displayName ?? null
          }
          beneficiaryCode={
            voice.structuredRecord?.beneficiaryId ?? selectedBeneficiary?.beneficiaryCode ?? null
          }
          language={language}
          persistedOfflineOnly={activeEmergency.persistedOfflineOnly}
          onReplayAlert={() => {
            void voice.speakText(langCfg.emergencyAnnouncement, true, 'DANGER_ALERT');
          }}
          onAcknowledgeAndReturn={() => {
            voice.resetPipeline();
            setActiveEmergency(null);
            setActiveSection('ALERTS');
          }}
        />
      )}

      <OfflineIndicator
        pendingDraftCount={offlineDrafts.length}
        onSyncNow={() => void handleSyncOfflineDrafts()}
        isSyncing={isSyncingOffline}
      />
    </div>
  );
}
