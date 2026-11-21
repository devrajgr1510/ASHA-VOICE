import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  History,
  Mic,
  Save,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getLanguageConfig } from '../shared/languages';
import type {
  LanguageCode,
  StructuredVisitRecord,
  VoicePipelineState,
} from '../shared/types';

interface StructuredRecordCardProps {
  record: StructuredVisitRecord | null;
  pipelineState: VoicePipelineState;
  language: LanguageCode;
  isSaving: boolean;
  highlightedField: string | null;
  onHoverField: (fieldName: string | null) => void;
  onListenAgain: () => void;
  onInterruptPlayback: () => void;
  onStartVoiceCorrection: () => void;
  onQuickVoiceCorrection: (correctionUtterance: string) => void;
  onSaveDraft: () => void;
  onOpenFullForm: () => void;
  onConfirmAndSave: () => void;
  onConfirmUncertainSafety: (isDangerPresent: boolean) => void;
}

function displayValue(val: string | number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined || val === '') return 'Not reported';
  return `${val}${suffix}`;
}

export const StructuredRecordCard: React.FC<StructuredRecordCardProps> = ({
  record,
  pipelineState,
  language,
  isSaving,
  highlightedField,
  onHoverField,
  onListenAgain,
  onInterruptPlayback,
  onStartVoiceCorrection,
  onQuickVoiceCorrection,
  onSaveDraft,
  onOpenFullForm,
  onConfirmAndSave,
  onConfirmUncertainSafety,
}) => {
  const langCfg = getLanguageConfig(language);

  if (!record) {
    return (
      <section className="flex h-full min-h-[380px] flex-col justify-center rounded-2xl border border-[#E7EDF2] bg-white p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F7F1] text-[#087F75]">
          <Mic className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-[#172B3A]">
          Structured Visit Summary
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#718096]">
          Tap <strong>{langCfg.labels.startHomeVisit}</strong> and speak naturally. Extracted
          fields, AI confidence scores, danger-sign status, and voice read-back controls will appear
          here with live transcript binding.
        </p>
      </section>
    );
  }

  const isSpeaking = pipelineState === 'SPEAKING';
  const hasUncertainSafety = record.dangerSignStatus === 'uncertain_pending_safety';

  const fieldCardClass = (fieldName: string, spanTwo = false) => {
    const active = highlightedField === fieldName;
    return `cursor-pointer rounded-xl border p-4 transition-all ${spanTwo ? 'sm:col-span-2' : ''} ${
      active
        ? 'border-[#087F75] bg-[#E8F7F1] ring-2 ring-[#10A77A]/30'
        : 'border-[#E7EDF2] bg-[#F7F9FC] hover:border-[#087F75]/40'
    }`;
  };

  const renderConfidence = (fieldName: string) => {
    const conf = record.fieldConfidence[fieldName];
    if (!conf) return null;
    return (
      <span className="font-mono text-[10px] font-semibold text-[#087F75]">
        {Math.round(conf * 100)}% AI
      </span>
    );
  };

  return (
    <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E7EDF2] pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-[#172B3A]">
            {langCfg.labels.verifying}
          </h3>
          <p className="mt-0.5 text-xs text-[#718096]">
            {record.extractionSource === 'GEMINI_STRUCTURED_AI'
              ? 'Gemini AI Extraction + NHM Rule Validation'
              : 'Offline Deterministic Rule Parser'}{' '}
            · Detected: {record.detectedLanguages.join(', ')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFullForm}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 py-1 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
          >
            <Edit3 className="h-3 w-3" aria-hidden="true" />
            Edit Form
          </button>
          <span className="font-mono text-xs font-semibold text-[#087F75]">
            {record.visitType} · {record.visitDate}
          </span>
        </div>
      </div>

      {/* Uncertain Safety Banner */}
      {hasUncertainSafety && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />
            <span>Pending Safety Clarification</span>
          </div>
          <p className="mt-1 text-sm">
            {record.dangerAnalysis.uncertainMatches[0]?.clarificationPrompt ??
              'An uncertain danger symptom was mentioned. Confirm whether a danger sign is present.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onConfirmUncertainSafety(true)}
              className="min-h-[44px] rounded-lg bg-[#D94B4B] px-4 py-2 text-xs font-bold text-white hover:bg-[#B91C1C]"
            >
              Yes — Trigger PHC Referral
            </button>
            <button
              type="button"
              onClick={() => onConfirmUncertainSafety(false)}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#172B3A] hover:bg-slate-50"
            >
              No — Symptom Absent
            </button>
          </div>
        </div>
      )}

      {/* Negation Verified Indicator */}
      {record.dangerAnalysis.negatedMatches.length > 0 &&
        record.dangerSignStatus === 'none_detected' && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-2.5 text-xs font-medium text-[#087F75]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10A77A]" aria-hidden="true" />
            <span>
              Safety check verified negation ({record.dangerAnalysis.negatedMatches.map((n) => n.code).join(', ')}) — no danger event created.
            </span>
          </div>
        )}

      {/* Interactive Provenance-Linked Field Grid */}
      <dl className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div
          className={fieldCardClass('beneficiaryName')}
          onMouseEnter={() => onHoverField('beneficiaryName')}
          onMouseLeave={() => onHoverField(null)}
        >
          <dt className="flex items-center justify-between text-xs font-semibold text-[#718096]">
            <span>Beneficiary</span>
            {renderConfidence('beneficiaryName')}
          </dt>
          <dd className="mt-1 text-lg font-bold text-[#172B3A]">
            {displayValue(record.beneficiaryName)}
          </dd>
        </div>

        <div
          className={fieldCardClass('beneficiaryId')}
          onMouseEnter={() => onHoverField('beneficiaryId')}
          onMouseLeave={() => onHoverField(null)}
        >
          <dt className="flex items-center justify-between text-xs font-semibold text-[#718096]">
            <span>Beneficiary ID</span>
            {renderConfidence('beneficiaryId')}
          </dt>
          <dd className="mt-1 font-mono text-lg font-bold text-[#172B3A]">
            {displayValue(record.beneficiaryId)}
          </dd>
        </div>

        {record.visitType === 'ANC' && record.pregnancyDetails && (
          <>
            <div
              className={fieldCardClass('weightKg')}
              onMouseEnter={() => onHoverField('weightKg')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="flex items-center justify-between text-xs font-semibold text-[#718096]">
                <span>Weight</span>
                {renderConfidence('weightKg')}
              </dt>
              <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-[#172B3A]">
                {displayValue(record.pregnancyDetails.weightKg, ' kg')}
              </dd>
            </div>

            <div
              className={fieldCardClass('ifaStatus')}
              onMouseEnter={() => onHoverField('ifaStatus')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-xs font-semibold text-[#718096]">IFA Status</dt>
              <dd className="mt-1 text-base font-bold text-[#172B3A]">
                {record.pregnancyDetails.ifaStatus
                  ? record.pregnancyDetails.ifaStatus.replace(/_/g, ' ')
                  : 'Not reported'}
              </dd>
            </div>

            <div
              className={fieldCardClass('vaccinationStatus')}
              onMouseEnter={() => onHoverField('vaccinationStatus')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-xs font-semibold text-[#718096]">Td / TT Vaccination</dt>
              <dd className="mt-1 text-base font-bold text-[#172B3A]">
                {record.pregnancyDetails.vaccinationStatus
                  ? record.pregnancyDetails.vaccinationStatus.replace(/_/g, ' ')
                  : 'Not reported'}
              </dd>
            </div>

            <div
              className={fieldCardClass('bloodPressure')}
              onMouseEnter={() => onHoverField('bloodPressure')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-xs font-semibold text-[#718096]">Blood Pressure</dt>
              <dd className="mt-1 font-mono text-base font-bold tabular-nums text-[#172B3A]">
                {displayValue(record.pregnancyDetails.bloodPressure)}
              </dd>
            </div>
          </>
        )}

        {record.visitType === 'NEWBORN' && record.newbornDetails && (
          <>
            <div
              className={fieldCardClass('currentWeightKg')}
              onMouseEnter={() => onHoverField('currentWeightKg')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="flex items-center justify-between text-xs font-semibold text-[#718096]">
                <span>Baby Weight</span>
                {renderConfidence('weightKg')}
              </dt>
              <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-[#172B3A]">
                {displayValue(
                  record.newbornDetails.currentWeightKg ?? record.newbornDetails.birthWeightKg,
                  ' kg',
                )}
              </dd>
            </div>

            <div
              className={fieldCardClass('feedingObservations')}
              onMouseEnter={() => onHoverField('feedingObservations')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-xs font-semibold text-[#718096]">Feeding Observations</dt>
              <dd className="mt-1 text-base font-bold text-[#172B3A]">
                {displayValue(record.newbornDetails.feedingObservations)}
              </dd>
            </div>

            <div
              className={fieldCardClass('immunisationChecked')}
              onMouseEnter={() => onHoverField('immunisationChecked')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-xs font-semibold text-[#718096]">Immunisation Checked</dt>
              <dd className="mt-1 text-base font-bold text-[#172B3A]">
                {record.newbornDetails.immunisationChecked === true
                  ? 'Checked'
                  : record.newbornDetails.immunisationChecked === false
                    ? 'Pending'
                    : 'Not reported'}
              </dd>
            </div>

            <div className={fieldCardClass('reportedTemperature')}>
              <dt className="text-xs font-semibold text-[#718096]">Reported Temperature</dt>
              <dd className="mt-1 font-mono text-base font-bold text-[#172B3A]">
                {displayValue(record.newbornDetails.reportedTemperature)}
              </dd>
            </div>
          </>
        )}

        {record.visitType === 'IMMUNISATION' && record.immunisationDetails && (
          <>
            <div
              className={fieldCardClass('vaccinesGiven')}
              onMouseEnter={() => onHoverField('vaccinesGiven')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-xs font-semibold text-[#718096]">Vaccines Given</dt>
              <dd className="mt-1 text-base font-bold text-[#172B3A]">
                {record.immunisationDetails.vaccinesGiven.length > 0
                  ? record.immunisationDetails.vaccinesGiven.join(', ')
                  : 'None reported'}
              </dd>
            </div>

            <div
              className={fieldCardClass('vaccinesDue')}
              onMouseEnter={() => onHoverField('vaccinesDue')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-xs font-semibold text-[#718096]">Vaccines Due</dt>
              <dd className="mt-1 text-base font-bold text-[#172B3A]">
                {record.immunisationDetails.vaccinesDue.length > 0
                  ? record.immunisationDetails.vaccinesDue.join(', ')
                  : 'None reported'}
              </dd>
            </div>
          </>
        )}

        <div
          className={fieldCardClass('nextVisitDate', true)}
          onMouseEnter={() => onHoverField('nextVisitDate')}
          onMouseLeave={() => onHoverField(null)}
        >
          <dt className="flex items-center justify-between text-xs font-semibold text-[#718096]">
            <span>Next Visit Date</span>
            {renderConfidence('nextVisitDate')}
          </dt>
          <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-[#172B3A]">
            {displayValue(record.nextVisitDate)}
          </dd>
        </div>
      </dl>

      {/* Voice Correction History */}
      {record.correctionHistory.length > 0 && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-[#EDF5FF] p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Voice Correction Audit Trail</span>
          </div>
          <ul className="mt-1.5 space-y-1 text-xs text-[#172B3A]">
            {record.correctionHistory.map((c, idx) => (
              <li key={idx}>
                <span className="font-mono font-semibold">{c.fieldName}</span>:{' '}
                {c.previousValue ?? 'empty'} → <strong>{c.correctedValue}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Voice Read-Back, Draft & Explicit Save Controls */}
      <div className="mt-6 border-t border-[#E7EDF2] pt-5">
        <p className="text-sm font-semibold text-[#172B3A]">{langCfg.labels.waitingConfirmation}</p>
        <p className="mt-0.5 text-xs text-[#718096]">{langCfg.labels.yesSavePrompt}</p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {isSpeaking ? (
            <button
              type="button"
              onClick={onInterruptPlayback}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
            >
              <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Stop &amp; Interrupt</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onListenAgain}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2.5 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
            >
              <Volume2 className="h-4 w-4 shrink-0 text-[#087F75]" aria-hidden="true" />
              <span>{langCfg.labels.listenAgain}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStartVoiceCorrection}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#087F75] bg-white px-3 py-2.5 text-xs font-bold text-[#087F75] hover:bg-[#E8F7F1]"
          >
            <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{langCfg.labels.correctByVoice}</span>
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#E7EDF2] bg-white px-3 py-2.5 text-xs font-semibold text-[#172B3A] hover:bg-[#F7F9FC]"
          >
            <ClipboardCheck className="h-4 w-4 shrink-0 text-[#087F75]" aria-hidden="true" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={onConfirmAndSave}
            disabled={isSaving || !record.beneficiaryId || hasUncertainSafety}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#10A77A] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#0D9169] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{isSaving ? 'Saving...' : langCfg.labels.confirmAndSave}</span>
          </button>
        </div>

        {/* Quick Voice Correction Test Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-[#718096]">Quick voice correction commands:</span>
          <button
            type="button"
            onClick={() => onQuickVoiceCorrection('No, weight is 2.8 kilo, not 3.8.')}
            className="min-h-[34px] rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 py-1 font-medium text-[#172B3A] hover:border-[#087F75]"
          >
            &ldquo;Weight is 2.8 kilo&rdquo;
          </button>
          <button
            type="button"
            onClick={() => onQuickVoiceCorrection('No, change the next visit date to 5 December.')}
            className="min-h-[34px] rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 py-1 font-medium text-[#172B3A] hover:border-[#087F75]"
          >
            &ldquo;Change next visit to 5 December&rdquo;
          </button>
          <button
            type="button"
            onClick={() => onQuickVoiceCorrection('Repeat the entire record')}
            className="min-h-[34px] rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 py-1 font-medium text-[#172B3A] hover:border-[#087F75]"
          >
            &ldquo;Repeat entire record&rdquo;
          </button>
        </div>
      </div>
    </section>
  );
};
