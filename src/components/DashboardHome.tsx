import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  HeartPulse,
  Mic,
  Sparkles,
  Syringe,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { QUESTION_GUIDES } from '../shared/questionGuides';
import type {
  AlertItem,
  AnalyticsBucket,
  DashboardSummary,
  FollowupTask,
  SavedVisitSummary,
  StructuredVisitRecord,
  VisitType,
} from '../shared/types';
import type { NavSection } from './SidebarNav';

interface DashboardHomeProps {
  summary: DashboardSummary | null;
  analyticsRange: '7d' | '30d';
  analyticsBuckets: AnalyticsBucket[];
  onChangeAnalyticsRange: (range: '7d' | '30d') => void;
  visits: SavedVisitSummary[];
  followups: FollowupTask[];
  alerts: AlertItem[];
  activeRecord: StructuredVisitRecord | null;
  activeTranscript: string;
  onStartVoiceVisit: (visitType?: VisitType) => void;
  onNavigate: (section: NavSection) => void;
  onCompleteFollowup: (id: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  summary,
  analyticsRange,
  analyticsBuckets,
  onChangeAnalyticsRange,
  visits,
  followups,
  alerts,
  activeRecord,
  activeTranscript,
  onStartVoiceVisit,
  onNavigate,
  onCompleteFollowup,
}) => {
  const [askCategory, setAskCategory] = useState<VisitType>('ANC');

  const visitsCompleted = summary?.visitsCompleted ?? visits.length;
  const pendingFollowupsCount =
    summary?.pendingFollowups ?? followups.filter((f) => f.taskStatus === 'PENDING').length;
  const alertEventsCount =
    summary?.alertEvents ?? alerts.filter((a) => a.severity === 'CRITICAL').length;
  const completionRate =
    summary?.recordCompletionRate ??
    (visits.length > 0
      ? Math.round(
          (visits.filter((v) => v.confirmationStatus === 'confirmed').length / visits.length) * 100,
        )
      : 100);

  const askItems = useMemo(
    () => QUESTION_GUIDES.filter((q) => q.visitType === askCategory),
    [askCategory],
  );

  // Live "What to Fill" preview fields derived from activeRecord or latest saved visit
  const previewRecord = activeRecord ?? visits[0]?.structuredPayload ?? null;
  const fillFieldStatuses = useMemo(() => {
    const r = previewRecord;
    const isConfirmed = r?.confirmationStatus === 'confirmed';
    const makeStatus = (hasVal: boolean) =>
      hasVal ? (isConfirmed ? 'Confirmed' : 'Needs Confirmation') : 'Not Provided';

    return [
      {
        label: 'Beneficiary & ID',
        value: r?.beneficiaryName ? `${r.beneficiaryName} (${r.beneficiaryId})` : 'Pending voice capture',
        status: makeStatus(Boolean(r?.beneficiaryId)),
      },
      {
        label: 'Visit Category',
        value: r?.visitType ?? 'ANC',
        status: makeStatus(Boolean(r?.visitType)),
      },
      {
        label: 'Clinical Weight / Vaccines',
        value:
          r?.visitType === 'ANC'
            ? r.pregnancyDetails?.weightKg
              ? `${r.pregnancyDetails.weightKg} kg · IFA: ${r.pregnancyDetails.ifaStatus?.replace(/_/g, ' ') ?? '—'}`
              : 'Awaiting vitals'
            : r?.visitType === 'NEWBORN'
              ? r.newbornDetails?.currentWeightKg
                ? `${r.newbornDetails.currentWeightKg} kg · ${r.newbornDetails.feedingObservations ?? 'Checked'}`
                : 'Awaiting newborn data'
              : r?.immunisationDetails?.vaccinesGiven?.length
                ? `Given: ${r.immunisationDetails.vaccinesGiven.join(', ')}`
                : 'Awaiting vaccine status',
        status: makeStatus(
          Boolean(
            r?.pregnancyDetails?.weightKg ||
              r?.newbornDetails?.currentWeightKg ||
              r?.immunisationDetails?.vaccinesGiven?.length,
          ),
        ),
      },
      {
        label: 'Next Visit Date',
        value: r?.nextVisitDate ?? 'Not specified yet',
        status: makeStatus(Boolean(r?.nextVisitDate)),
      },
    ];
  }, [previewRecord]);

  const upcomingFollowups = followups.filter((f) => f.taskStatus === 'PENDING').slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 1. Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#102B35] via-[#0D5B5E] to-[#087F75] p-6 text-white shadow-sm sm:p-8">
        <div className="relative z-10 grid items-center gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/12 px-3 py-1 text-xs font-semibold text-[#E8F7F1]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Voice-First AI Field Register · NHM Verified Safety Rules</span>
            </div>

            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Every Visit Matters!
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[#E2F3F0] sm:text-base">
              Your voice can make every household healthcare visit easier. Speak naturally in your
              local language to capture ANC, newborn, and immunisation visits with automatic safety
              screening and read-back confirmation.
            </p>

            {/* Acoustic Waveform Decoration */}
            <div className="flex items-center gap-3 pt-1" aria-hidden="true">
              <div className="flex h-7 items-center gap-1">
                {[0.3, 0.7, 0.5, 0.95, 0.6, 0.85, 0.4, 0.9, 0.55, 0.75, 0.35, 0.65].map(
                  (h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-[#A7F3D0]/80"
                      style={{ height: `${Math.round(h * 26)}px` }}
                    />
                  ),
                )}
              </div>
              <span className="font-mono text-xs text-[#A7F3D0]">
                12 Indian Languages + Code-Mixing Active
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onStartVoiceVisit('ANC')}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#10A77A] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0D9169]"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Start New Voice Visit</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('HISTORY')}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                <span>View Visit History</span>
              </button>
            </div>
          </div>

          <div className="hidden justify-end lg:col-span-4 lg:flex">
            <div className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10 p-2.5 shadow-lg">
              <img
                src="/src/assets/images/asha_worker_portrait_1795246317288.jpg"
                alt="ASHA Community Health Worker"
                referrerPolicy="no-referrer"
                className="h-48 w-56 rounded-xl object-cover"
              />
              <div className="mt-2.5 flex items-center justify-between gap-3 px-1 text-[11px]">
                <span className="font-semibold text-white">Field Ready</span>
                <span className="font-mono text-[#A7F3D0]">0h Retention</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4 KPI Summary Cards */}
      <section aria-label="Key Field Metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Visits Completed</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F7F1] text-[#087F75]">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-[#172B3A]">
            {visitsCompleted}
          </div>
          <div className="mt-1 text-xs text-[#718096]">
            {summary?.ancCount ?? 0} ANC · {summary?.newbornCount ?? 0} Newborn ·{' '}
            {summary?.immunisationCount ?? 0} Immunisation
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Pending Follow-ups</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EDF5FF] text-[#2563EB]">
              <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-[#172B3A]">
            {pendingFollowupsCount}
          </div>
          <div className="mt-1 text-xs text-[#718096]">
            {summary?.completedFollowups ?? 0} completed tasks · Auto-scheduled
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Alert Events</span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                alertEventsCount > 0
                  ? 'bg-red-50 text-[#D94B4B]'
                  : 'bg-[#E8F7F1] text-[#087F75]'
              }`}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div
            className={`mt-2 font-display text-3xl font-extrabold tabular-nums ${
              alertEventsCount > 0 ? 'text-[#D94B4B]' : 'text-[#172B3A]'
            }`}
          >
            {alertEventsCount}
          </div>
          <div className="mt-1 text-xs text-[#718096]">
            {summary?.pendingReferrals ?? 0} pending PHC acknowledgement
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Record Completion Rate</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F7F1] text-[#10A77A]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-[#10A77A]">
            {completionRate}%
          </div>
          <div className="mt-1 text-xs text-[#718096]">
            Confirmed with worker read-back verification
          </div>
        </div>
      </section>

      {/* 3. Two-Column Interactive "What to Ask" & "What to Fill" Cards */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* What to Ask Card */}
        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7EDF2] pb-3.5">
              <div>
                <h3 className="font-display text-base font-bold text-[#172B3A]">
                  What to Ask · Field Question Guide
                </h3>
                <p className="mt-0.5 text-xs text-[#718096]">
                  Live DOM checklist updates automatically as you speak during a visit
                </p>
              </div>
              <div className="flex gap-1 rounded-xl bg-[#F7F9FC] p-1">
                {(['ANC', 'NEWBORN', 'IMMUNISATION'] as VisitType[]).map((vt) => (
                  <button
                    key={vt}
                    type="button"
                    onClick={() => setAskCategory(vt)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      askCategory === vt
                        ? 'bg-[#087F75] text-white'
                        : 'text-[#718096] hover:text-[#172B3A]'
                    }`}
                  >
                    {vt === 'ANC' ? 'ANC' : vt === 'NEWBORN' ? 'Newborn' : 'Imm.'}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-4 space-y-2.5">
              {askItems.slice(0, 4).map((q) => {
                const answered = q.isAnswered(activeRecord, activeTranscript);
                return (
                  <li
                    key={q.id}
                    className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-xs ${
                      answered
                        ? 'border-[#A7F3D0] bg-[#E8F7F1]'
                        : 'border-[#E7EDF2] bg-[#F7F9FC]'
                    }`}
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        answered ? 'text-[#10A77A]' : 'text-[#94A3B8]'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-[#172B3A]">{q.question}</div>
                      <div className="mt-0.5 text-[11px] text-[#718096]">{q.hint}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5 border-t border-[#E7EDF2] pt-4">
            <button
              type="button"
              onClick={() => onNavigate('WHAT_TO_ASK')}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
            >
              <span>Open Question Guide</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onStartVoiceVisit(askCategory)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#087F75] px-4 py-2 text-xs font-bold text-white hover:bg-[#066860]"
            >
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Start Voice Questions</span>
            </button>
          </div>
        </div>

        {/* What to Fill Card */}
        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7EDF2] pb-3.5">
              <div>
                <h3 className="font-display text-base font-bold text-[#172B3A]">
                  What to Fill · Auto-Populated Visit Form
                </h3>
                <p className="mt-0.5 text-xs text-[#718096]">
                  {activeRecord
                    ? 'Active voice capture ready for verification'
                    : 'Previewing most recent visit record fields'}
                </p>
              </div>
              <span className="rounded-lg bg-[#EDF5FF] px-2.5 py-1 font-mono text-xs font-semibold text-[#1D4ED8]">
                AI Schema Bound
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {fillFieldStatuses.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#718096]">{f.label}</div>
                    <div className="truncate text-xs font-bold text-[#172B3A]">{f.value}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                      f.status === 'Confirmed'
                        ? 'bg-[#E8F7F1] text-[#087F75]'
                        : f.status === 'Needs Confirmation'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200/80 text-[#718096]'
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5 border-t border-[#E7EDF2] pt-4">
            <button
              type="button"
              onClick={() => onNavigate('WHAT_TO_FILL')}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
            >
              <span>Open Visit Form</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('WHAT_TO_FILL')}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#10A77A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D9169]"
            >
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Review Auto-Filled Data</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. 4 Quick Access Cards */}
      <section aria-label="Quick Visit Modules" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Pregnancy & ANC',
            desc: 'Weight, BP, IFA tablets, Td/TT & danger signs',
            icon: HeartPulse,
            accent: 'bg-[#E8F7F1] text-[#087F75]',
            onClick: () => onStartVoiceVisit('ANC'),
          },
          {
            title: 'Newborn Care',
            desc: 'HBNC weight, breastfeeding, cord & fever check',
            icon: Baby,
            accent: 'bg-[#EDF5FF] text-[#2563EB]',
            onClick: () => onStartVoiceVisit('NEWBORN'),
          },
          {
            title: 'Immunisation',
            desc: 'BCG, OPV, Pentavalent, PCV & NIS 2026 due doses',
            icon: Syringe,
            accent: 'bg-amber-50 text-[#D97706]',
            onClick: () => onStartVoiceVisit('IMMUNISATION'),
          },
          {
            title: 'Visit History',
            desc: 'Search past records, transcripts & CSV export',
            icon: ClipboardList,
            accent: 'bg-slate-100 text-[#172B3A]',
            onClick: () => onNavigate('HISTORY'),
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={card.onClick}
              className="group flex items-start gap-3.5 rounded-2xl border border-[#E7EDF2] bg-white p-4 text-left transition-colors hover:border-[#087F75]"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.accent}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="font-display text-sm font-bold text-[#172B3A] group-hover:text-[#087F75]">
                  {card.title}
                </div>
                <p className="mt-0.5 text-xs leading-snug text-[#718096]">{card.desc}</p>
              </div>
            </button>
          );
        })}
      </section>

      {/* 5. Recharts Analytics + Upcoming Follow-ups & Alerts */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7EDF2] pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#172B3A]">
                Visits Recorded by Category
              </h3>
              <p className="mt-0.5 text-xs text-[#718096]">
                Real-time visit volume across ANC, Newborn, and Immunisation schedules
              </p>
            </div>

            <div className="flex gap-1 rounded-xl bg-[#F7F9FC] p-1">
              {(['7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onChangeAnalyticsRange(r)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                    analyticsRange === r
                      ? 'bg-[#087F75] text-white'
                      : 'text-[#718096] hover:text-[#172B3A]'
                  }`}
                >
                  {r === '7d' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsBuckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7EDF2" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#718096' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#718096' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E7EDF2',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="ANC" name="Pregnancy ANC" stackId="a" fill="#087F75" radius={[0, 0, 0, 0]} />
                <Bar dataKey="NEWBORN" name="Newborn Care" stackId="a" fill="#10A77A" radius={[0, 0, 0, 0]} />
                <Bar
                  dataKey="IMMUNISATION"
                  name="Immunisation"
                  stackId="a"
                  fill="#60A5FA"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-5">
          {/* Upcoming Follow-ups */}
          <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 className="font-display text-sm font-bold text-[#172B3A]">
                Upcoming Follow-ups
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('FOLLOWUPS')}
                className="text-xs font-semibold text-[#087F75] hover:underline"
              >
                View all
              </button>
            </div>
            {upcomingFollowups.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#718096]">
                All scheduled follow-ups are completed.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {upcomingFollowups.map((fu) => (
                  <li
                    key={fu.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-[#172B3A]">
                        {fu.beneficiaryName} ·{' '}
                        <span className="font-mono text-[#718096]">{fu.beneficiaryCode}</span>
                      </div>
                      <div className="truncate text-[11px] text-[#718096]">
                        {fu.taskDescription}
                      </div>
                      {fu.dueDate && (
                        <div className="mt-0.5 font-mono text-[10px] font-semibold text-[#087F75]">
                          Due {fu.dueDate}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onCompleteFollowup(fu.id)}
                      className="shrink-0 rounded-lg border border-[#E7EDF2] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                    >
                      Done
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Alerts */}
          <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 className="font-display text-sm font-bold text-[#172B3A]">
                Recent Alerts &amp; Safety Flags
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('ALERTS')}
                className="text-xs font-semibold text-[#087F75] hover:underline"
              >
                View all
              </button>
            </div>
            {alerts.length === 0 ? (
              <p className="py-5 text-center text-xs text-[#718096]">
                No danger-sign alerts or missing-field flags.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {alerts.slice(0, 3).map((al) => (
                  <li
                    key={al.id}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      al.severity === 'CRITICAL'
                        ? 'border-red-200 bg-red-50/70 text-[#991B1B]'
                        : 'border-amber-200 bg-amber-50/70 text-amber-900'
                    }`}
                  >
                    <div className="font-bold">{al.title}</div>
                    <div className="mt-0.5 truncate opacity-90">{al.description}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
