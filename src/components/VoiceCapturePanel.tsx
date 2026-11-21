import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Baby,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  Square,
  Syringe,
  UserSearch,
  Volume2,
  X,
} from 'lucide-react';
import { getLanguageConfig } from '../shared/languages';
import { QUESTION_GUIDES } from '../shared/questionGuides';
import type {
  AcousticTelemetry,
  Beneficiary,
  LanguageCode,
  StructuredVisitRecord,
  TranscriptProvenanceSpan,
  VisitType,
  VoicePipelineState,
} from '../shared/types';

interface VoiceCapturePanelProps {
  language: LanguageCode;
  visitType: VisitType;
  onChangeVisitType: (type: VisitType) => void;
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary | null;
  onSelectBeneficiary: (ben: Beneficiary | null) => void;
  onCreateBeneficiary: (payload: {
    displayName: string;
    beneficiaryType: Beneficiary['beneficiaryType'];
    locality?: string;
  }) => Promise<Beneficiary>;
  ambiguityCandidates: Beneficiary[];
  pipelineState: VoicePipelineState;
  waveformBars: number[];
  acousticTelemetry: AcousticTelemetry;
  recordingSeconds: number;
  liveTranscript: string;
  partialTranscript: string;
  fieldProvenance: TranscriptProvenanceSpan[];
  highlightedField: string | null;
  onHoverField: (fieldName: string | null) => void;
  structuredRecord: StructuredVisitRecord | null;
  noiseWarning: string | null;
  micError: string | null;
  providerStatus: string;
  ttfaMs: number | null;
  isOnline: boolean;
  onStartListening: () => void;
  onPauseListening: () => void;
  onResumeListening: () => void;
  onStopListening: () => void;
  onCancelListening: () => void;
  onBargeIn: () => void;
  onRunJudgeScenario: (transcript: string, targetVisitType?: VisitType, benCode?: string | null) => void;
}

const JUDGE_SCENARIOS: Array<{
  id: string;
  label: string;
  visitType: VisitType;
  beneficiaryCode: string | null;
  transcript: string;
}> = [
  {
    id: 's1',
    label: '1. Pregnancy ANC Visit (Nandini · ASHA00125)',
    visitType: 'ANC',
    beneficiaryCode: 'ASHA00125',
    transcript:
      'Today I visited beneficiary ASHA00125, Nandini. ANC checkup completed. Weight is 52 kilo. IFA goli taking. Next visit on 28 November.',
  },
  {
    id: 's2',
    label: '2. Newborn Visit (Baby of Rekha · ASHA00127)',
    visitType: 'NEWBORN',
    beneficiaryCode: 'ASHA00127',
    transcript:
      'Baby weight 2.8 kilo, baby is feeding properly, vaccination record checked.',
  },
  {
    id: 's4',
    label: '4. Pregnancy Danger Sign (Vaginal Bleeding)',
    visitType: 'ANC',
    beneficiaryCode: 'ASHA00125',
    transcript: 'The pregnant woman Nandini ASHA00125 has vaginal bleeding.',
  },
  {
    id: 's5',
    label: '5. Newborn Danger Sign (High Fever & Not Feeding)',
    visitType: 'NEWBORN',
    beneficiaryCode: 'ASHA00127',
    transcript: 'The newborn ASHA00127 has high fever and is not feeding.',
  },
  {
    id: 's6',
    label: '6. Noisy / Unclear Speech Recovery (Zero Invented Fields)',
    visitType: 'ANC',
    beneficiaryCode: 'ASHA00129',
    transcript:
      'Visited Kavya ASHA00129. Background noise unclear weight... ANC checkup done, no bleeding.',
  },
  {
    id: 's7',
    label: '7. Kannada-English Code-Mixing (ANC + IFA + TT)',
    visitType: 'ANC',
    beneficiaryCode: 'ASHA00125',
    transcript:
      'Today Nandini ASHA00125 avarige ANC checkup agide, weight 52 kilo ide, IFA goli regular aagi togondiddare, TT injection complete agide.',
  },
  {
    id: 's9',
    label: '9. Negation Safety Test (Mother has no bleeding)',
    visitType: 'ANC',
    beneficiaryCode: 'ASHA00126',
    transcript:
      'Visited ASHA00126 Lakshmi. Mother has no bleeding. Weight is 54 kilo. Next visit on 29 November.',
  },
  {
    id: 's10',
    label: '11. Immunisation Visit (Aarav · ASHA00128)',
    visitType: 'IMMUNISATION',
    beneficiaryCode: 'ASHA00128',
    transcript:
      'Aarav ASHA00128 immunisation visit. OPV-1 and Pentavalent-1 given today. PCV-1 due. Next visit on 18 December.',
  },
];

const STATE_DISPLAY: Record<VoicePipelineState, { label: string; style: string }> = {
  IDLE: { label: 'READY', style: 'bg-slate-100 text-[#172B3A] border-[#E7EDF2]' },
  LISTENING: { label: 'LISTENING', style: 'bg-[#E8F7F1] text-[#087F75] border-[#087F75]/30' },
  PAUSED: { label: 'PAUSED', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  PROCESSING: { label: 'AI EXTRACTING', style: 'bg-[#EDF5FF] text-[#1D4ED8] border-blue-200' },
  VERIFYING: { label: 'VERIFYING', style: 'bg-sky-50 text-sky-800 border-sky-200' },
  SPEAKING: { label: 'READ-BACK', style: 'bg-[#E8F7F1] text-[#087F75] border-[#A7F3D0]' },
  WAITING_CONFIRMATION: {
    label: 'CONFIRMATION NEEDED',
    style: 'bg-amber-50 text-amber-900 border-amber-300',
  },
  SAVING: { label: 'SAVING', style: 'bg-[#E8F7F1] text-[#087F75] border-[#A7F3D0]' },
  COMPLETED: { label: 'SAVED', style: 'bg-[#E8F7F1] text-[#10A77A] border-[#A7F3D0]' },
  DANGER_ALERT: { label: 'DANGER ALERT', style: 'bg-red-100 text-[#D94B4B] border-red-300' },
};

export const VoiceCapturePanel: React.FC<VoiceCapturePanelProps> = ({
  language,
  visitType,
  onChangeVisitType,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  onCreateBeneficiary,
  ambiguityCandidates,
  pipelineState,
  waveformBars,
  acousticTelemetry,
  recordingSeconds,
  liveTranscript,
  partialTranscript,
  fieldProvenance,
  highlightedField,
  onHoverField,
  structuredRecord,
  noiseWarning,
  micError,
  providerStatus,
  ttfaMs,
  isOnline,
  onStartListening,
  onPauseListening,
  onResumeListening,
  onStopListening,
  onCancelListening,
  onBargeIn,
  onRunJudgeScenario,
}) => {
  const [showJudgeDrawer, setShowJudgeDrawer] = useState(false);
  const [showAddBenModal, setShowAddBenModal] = useState(false);
  const [newBenName, setNewBenName] = useState('');
  const [newBenType, setNewBenType] = useState<Beneficiary['beneficiaryType']>('PREGNANT_WOMAN');
  const [newBenLocality, setNewBenLocality] = useState('Devanahalli Ward 4');
  const [creatingBen, setCreatingBen] = useState(false);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  const langCfg = getLanguageConfig(language);
  const isListening = pipelineState === 'LISTENING';
  const isPaused = pipelineState === 'PAUSED';
  const isSpeaking = pipelineState === 'SPEAKING';
  const stateBadge = STATE_DISPLAY[pipelineState];
  const displayTranscript = liveTranscript || partialTranscript;

  // Scroll highlighted DOM span into view automatically
  useEffect(() => {
    if (!highlightedField || !transcriptContainerRef.current) return;
    const el = transcriptContainerRef.current.querySelector(
      `[data-field-ref="${highlightedField}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedField]);

  const activeChecklist = QUESTION_GUIDES.filter((q) => q.visitType === visitType);

  const renderProvenanceTranscript = () => {
    if (!displayTranscript) return null;
    if (fieldProvenance.length === 0) {
      return <p className="mt-1.5 text-sm leading-relaxed text-[#172B3A]">{displayTranscript}</p>;
    }

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    fieldProvenance.forEach((span, idx) => {
      if (span.startIndex > cursor) {
        nodes.push(
          <span key={`txt-${idx}`}>{displayTranscript.slice(cursor, span.startIndex)}</span>,
        );
      }
      const isHighlighted = highlightedField === span.fieldName;
      nodes.push(
        <mark
          key={`span-${idx}`}
          data-field-ref={span.fieldName}
          onMouseEnter={() => onHoverField(span.fieldName)}
          onMouseLeave={() => onHoverField(null)}
          onClick={() => onHoverField(isHighlighted ? null : span.fieldName)}
          title={`${span.label} · ${Math.round(span.confidence * 100)}% AI confidence`}
          className={`cursor-pointer rounded-md px-1 py-0.5 font-semibold transition-all ${
            span.fieldName === 'dangerSignStatus'
              ? isHighlighted
                ? 'bg-[#D94B4B] text-white ring-2 ring-red-300'
                : 'bg-red-100 text-[#991B1B]'
              : isHighlighted
                ? 'bg-[#087F75] text-white ring-2 ring-[#10A77A]/40'
                : 'bg-[#E8F7F1] text-[#087F75] hover:bg-[#D1FAE5]'
          }`}
        >
          {displayTranscript.slice(span.startIndex, span.endIndex)}
        </mark>,
      );
      cursor = span.endIndex;
    });
    if (cursor < displayTranscript.length) {
      nodes.push(<span key="txt-tail">{displayTranscript.slice(cursor)}</span>);
    }

    return <p className="mt-1.5 text-sm leading-relaxed text-[#172B3A]">{nodes}</p>;
  };

  const handleCreateBeneficiarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenName.trim()) return;
    setCreatingBen(true);
    try {
      const created = await onCreateBeneficiary({
        displayName: newBenName.trim(),
        beneficiaryType: newBenType,
        locality: newBenLocality,
      });
      onSelectBeneficiary(created);
      setNewBenName('');
      setShowAddBenModal(false);
    } finally {
      setCreatingBen(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
      {/* State Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7EDF2] pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#172B3A]">
            Voice Home Visit Capture
          </h2>
          <p className="mt-0.5 text-xs text-[#718096]">
            {langCfg.nativeName} ({langCfg.name}) · {isOnline ? 'Connected' : 'Offline Draft Mode'}
            {ttfaMs !== null ? ` · TTFA ${ttfaMs}ms` : ''}
          </p>
        </div>

        <span
          data-testid="voice-pipeline-state"
          className={`inline-flex items-center rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${stateBadge.style}`}
        >
          {stateBadge.label}
        </span>
      </div>

      {/* 1. Visit Category Controls */}
      <div className="mt-5">
        <span className="block text-xs font-semibold text-[#718096]">1. Visit Category</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              { type: 'ANC' as VisitType, label: 'Pregnancy', icon: HeartPulse },
              { type: 'NEWBORN' as VisitType, label: 'Newborn', icon: Baby },
              { type: 'IMMUNISATION' as VisitType, label: 'Immunisation', icon: Syringe },
            ] as const
          ).map(({ type, label, icon: Icon }) => {
            const active = visitType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onChangeVisitType(type)}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-sm whitespace-nowrap ${
                  active
                    ? 'border-[#087F75] bg-[#087F75] text-white'
                    : 'border-[#E7EDF2] bg-[#F7F9FC] text-[#172B3A] hover:border-[#087F75]/50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Beneficiary Selector + Quick Create Synthetic Profile */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="beneficiary-select"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#718096]"
          >
            <UserSearch className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
            <span>2. Beneficiary (Auto-detected or Select)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAddBenModal(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 py-1 text-[11px] font-bold text-[#087F75] hover:bg-[#E8F7F1]"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            <span>New Profile</span>
          </button>
        </div>
        <select
          id="beneficiary-select"
          value={selectedBeneficiary?.beneficiaryCode ?? ''}
          onChange={(e) => {
            const code = e.target.value;
            const found = beneficiaries.find((b) => b.beneficiaryCode === code) ?? null;
            onSelectBeneficiary(found);
          }}
          className="mt-2 min-h-[46px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3.5 text-sm font-medium text-[#172B3A] focus:border-[#087F75] focus:outline-none"
        >
          <option value="">Detect automatically from spoken visit notes</option>
          {beneficiaries.map((b) => (
            <option key={b.id} value={b.beneficiaryCode}>
              {b.beneficiaryCode} · {b.displayName} ({b.beneficiaryType.replace(/_/g, ' ')})
            </option>
          ))}
        </select>

        {ambiguityCandidates.length > 1 && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5">
            <p className="text-xs font-semibold text-amber-900">
              Multiple matching beneficiaries found. Confirm which beneficiary you visited:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ambiguityCandidates.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => onSelectBeneficiary(cand)}
                  className="min-h-[40px] rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
                >
                  {cand.beneficiaryCode} · {cand.displayName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Central Microphone Capture, Pause/Resume/Cancel & Live FFT DSP Telemetry */}
      <div className="mt-5 flex flex-col items-center rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-5 text-center">
        <button
          type="button"
          onClick={
            isListening
              ? onStopListening
              : isPaused
                ? onResumeListening
                : isSpeaking
                  ? onBargeIn
                  : onStartListening
          }
          aria-label={
            isListening
              ? 'Stop recording visit notes'
              : isPaused
                ? 'Resume recording visit notes'
                : isSpeaking
                  ? 'Interrupt playback and speak correction'
                  : langCfg.labels.startHomeVisit
          }
          className={`flex h-20 w-20 items-center justify-center rounded-full shadow-md transition-transform active:scale-95 ${
            isListening
              ? 'bg-[#D94B4B] text-white hover:bg-[#B91C1C]'
              : isPaused
                ? 'bg-[#F4A340] text-white hover:bg-amber-600'
                : isSpeaking
                  ? 'bg-[#F4A340] text-white hover:bg-amber-600'
                  : 'bg-[#10A77A] text-white hover:bg-[#0D9169]'
          }`}
        >
          {isListening ? (
            <Square className="h-8 w-8 fill-current" aria-hidden="true" />
          ) : isPaused ? (
            <Play className="h-9 w-9 fill-current" aria-hidden="true" />
          ) : (
            <Mic className="h-9 w-9" aria-hidden="true" />
          )}
        </button>

        <div className="mt-3 text-base font-bold text-[#172B3A]">
          {isListening
            ? langCfg.labels.listening
            : isPaused
              ? 'Recording Paused'
              : isSpeaking
                ? 'Tap to Interrupt & Correct (Barge-In)'
                : langCfg.labels.startHomeVisit}
        </div>
        <div className="mt-1 font-mono text-xs tabular-nums text-[#718096]">
          {isListening || isPaused
            ? `Elapsed · 00:${String(recordingSeconds).padStart(2, '0')} · ${
                isPaused ? 'Paused' : 'VAD Auto-endpointing active'
              }`
            : providerStatus}
        </div>

        {/* Pause / Resume / Stop / Cancel Control Strip */}
        {(isListening || isPaused) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {isListening ? (
              <button
                type="button"
                onClick={onPauseListening}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#172B3A] hover:bg-amber-50"
              >
                <Pause className="h-3.5 w-3.5 text-[#F4A340]" aria-hidden="true" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onResumeListening}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#10A77A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0D9169]"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resume</span>
              </button>
            )}
            <button
              type="button"
              onClick={onStopListening}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#087F75] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#066860]"
            >
              <Square className="h-3 w-3 fill-current" aria-hidden="true" />
              <span>Finish &amp; Extract</span>
            </button>
            <button
              type="button"
              onClick={onCancelListening}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#D94B4B] hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cancel</span>
            </button>
          </div>
        )}

        {/* Real Audio Analyser FFT Waveform */}
        <div
          aria-hidden="true"
          className="mt-4 flex h-10 w-full max-w-xs items-center justify-center gap-1"
        >
          {waveformBars.map((level, idx) => (
            <div
              key={idx}
              className={`w-1.5 rounded-full transition-transform duration-75 ${
                isListening
                  ? acousticTelemetry.vadActive
                    ? 'bg-[#10A77A]'
                    : 'bg-[#087F75]'
                  : 'bg-[#CBD5E1]'
              }`}
              style={{
                height: `${Math.round(Math.max(12, level * 100))}%`,
              }}
            />
          ))}
        </div>

        {/* Real Web Audio DSP & AI Model Strip */}
        <div className="mt-3 grid w-full grid-cols-3 gap-2 rounded-xl border border-[#E7EDF2] bg-white px-3 py-2 text-left text-[11px]">
          <div>
            <span className="text-[#718096]">Signal / SNR</span>
            <div className="font-mono font-bold tabular-nums text-[#172B3A]">
              {acousticTelemetry.rmsDb} dBFS · {acousticTelemetry.snrEstimateDb} dB
            </div>
          </div>
          <div>
            <span className="text-[#718096]">Environment</span>
            <div
              className={`font-semibold ${
                acousticTelemetry.noiseEnvironment === 'Noisy Household'
                  ? 'text-[#D94B4B]'
                  : acousticTelemetry.noiseEnvironment === 'Moderate'
                    ? 'text-[#F4A340]'
                    : 'text-[#087F75]'
              }`}
            >
              {acousticTelemetry.noiseEnvironment}
            </div>
          </div>
          <div>
            <span className="text-[#718096]">ML Models</span>
            <div className="flex items-center gap-1 font-mono font-semibold text-[#087F75]">
              <Activity className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Gemini + NHM</span>
            </div>
          </div>
        </div>

        {isSpeaking && (
          <button
            type="button"
            onClick={onBargeIn}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Interrupt Read-Back &amp; Speak
          </button>
        )}
      </div>

      {/* Live DOM Auto-Checking Question Pills */}
      <div className="mt-4 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#718096]">
          <span>Live &ldquo;What to Ask&rdquo; DOM Tracker ({visitType})</span>
          <span className="font-mono text-[#087F75]">
            {activeChecklist.filter((q) => q.isAnswered(structuredRecord, displayTranscript)).length}/
            {activeChecklist.length} covered
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {activeChecklist.map((q) => {
            const covered = q.isAnswered(structuredRecord, displayTranscript);
            return (
              <span
                key={q.id}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                  covered
                    ? 'border-[#A7F3D0] bg-[#E8F7F1] text-[#087F75]'
                    : 'border-[#E7EDF2] bg-white text-[#718096]'
                }`}
              >
                <CheckCircle2
                  className={`h-3 w-3 ${covered ? 'text-[#10A77A]' : 'text-[#CBD5E1]'}`}
                  aria-hidden="true"
                />
                {q.categoryLabel}
              </span>
            );
          })}
        </div>
      </div>

      {/* Microphone / Noise Warnings */}
      {noiseWarning && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{noiseWarning}</span>
        </div>
      )}

      {micError && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-[#D94B4B]"
        >
          <MicOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{micError}</span>
        </div>
      )}

      {/* Interactive DOM Provenance Transcript Box */}
      {displayTranscript && (
        <div
          ref={transcriptContainerRef}
          className="mt-4 rounded-xl border border-[#E7EDF2] bg-white p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#718096]">
              Recognized Speech Transcript (Hover highlights to inspect linked DOM fields)
            </span>
            {fieldProvenance.length > 0 && (
              <span className="shrink-0 whitespace-nowrap font-mono text-[11px] font-semibold text-[#087F75]">
                {fieldProvenance.length} spans bound
              </span>
            )}
          </div>
          {renderProvenanceTranscript()}
        </div>
      )}

      {/* Collapsible Live Judge Utterance Replay Drawer */}
      <div className="mt-5 border-t border-[#E7EDF2] pt-4">
        <button
          type="button"
          onClick={() => setShowJudgeDrawer((prev) => !prev)}
          aria-expanded={showJudgeDrawer}
          className="flex min-h-[42px] w-full items-center justify-between rounded-xl px-2 text-left text-xs font-semibold text-[#718096] hover:bg-[#F7F9FC] hover:text-[#172B3A]"
        >
          <span>Live Judge Test Utterances (Scenarios 1–11 · Bypass Mic Hardware)</span>
          {showJudgeDrawer ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        {showJudgeDrawer && (
          <div className="mt-3 space-y-2">
            <div className="grid gap-2">
              {JUDGE_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() =>
                    onRunJudgeScenario(sc.transcript, sc.visitType, sc.beneficiaryCode)
                  }
                  className="min-h-[46px] rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3.5 py-2.5 text-left transition-colors hover:border-[#087F75] hover:bg-[#E8F7F1]/50"
                >
                  <div className="text-xs font-bold text-[#087F75]">{sc.label}</div>
                  <div className="mt-0.5 text-xs text-[#718096]">&ldquo;{sc.transcript}&rdquo;</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Create Synthetic Beneficiary Modal */}
      {showAddBenModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-ben-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={(e) => void handleCreateBeneficiarySubmit(e)}
            className="w-full max-w-md rounded-2xl border border-[#E7EDF2] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 id="add-ben-title" className="font-display text-base font-bold text-[#172B3A]">
                Register Synthetic Beneficiary Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBenModal(false)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-[#718096] hover:bg-[#F7F9FC]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="new-ben-name" className="block text-xs font-semibold text-[#718096]">
                  Beneficiary Display Name (Synthetic Demo Only)
                </label>
                <input
                  id="new-ben-name"
                  type="text"
                  required
                  value={newBenName}
                  onChange={(e) => setNewBenName(e.target.value)}
                  placeholder="e.g. Sunita Devi"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm text-[#172B3A]"
                />
              </div>
              <div>
                <label htmlFor="new-ben-type" className="block text-xs font-semibold text-[#718096]">
                  Category
                </label>
                <select
                  id="new-ben-type"
                  value={newBenType}
                  onChange={(e) => setNewBenType(e.target.value as Beneficiary['beneficiaryType'])}
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm text-[#172B3A]"
                >
                  <option value="PREGNANT_WOMAN">Pregnant Woman</option>
                  <option value="NEWBORN">Newborn</option>
                  <option value="CHILD">Child (Immunisation)</option>
                </select>
              </div>
              <div>
                <label htmlFor="new-ben-locality" className="block text-xs font-semibold text-[#718096]">
                  Ward / Locality
                </label>
                <input
                  id="new-ben-locality"
                  type="text"
                  value={newBenLocality}
                  onChange={(e) => setNewBenLocality(e.target.value)}
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm text-[#172B3A]"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBenModal(false)}
                className="min-h-[42px] rounded-xl border border-[#E7EDF2] bg-white px-4 py-2 text-xs font-semibold text-[#172B3A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingBen}
                className="min-h-[42px] rounded-xl bg-[#10A77A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D9169] disabled:opacity-50"
              >
                {creatingBen ? 'Creating...' : 'Create Synthetic Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
