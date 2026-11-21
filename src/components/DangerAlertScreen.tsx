import React from 'react';
import { AlertTriangle, CheckCircle2, PhoneCall, ShieldAlert, Volume2 } from 'lucide-react';
import { getLanguageConfig } from '../shared/languages';
import type { DangerSignAnalysis, LanguageCode } from '../shared/types';

interface DangerAlertScreenProps {
  analysis: DangerSignAnalysis;
  beneficiaryName: string | null;
  beneficiaryCode: string | null;
  language: LanguageCode;
  persistedOfflineOnly: boolean;
  onReplayAlert: () => void;
  onAcknowledgeAndReturn: () => void;
}

export const DangerAlertScreen: React.FC<DangerAlertScreenProps> = ({
  analysis,
  beneficiaryName,
  beneficiaryCode,
  language,
  persistedOfflineOnly,
  onReplayAlert,
  onAcknowledgeAndReturn,
}) => {
  const langCfg = getLanguageConfig(language);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="danger-alert-heading"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#B91C1C] px-4 py-6 text-white sm:px-8 sm:py-10"
    >
      <div className="mx-auto max-w-2xl">
        {/* Urgent Header */}
        <div className="flex items-start gap-4 rounded-2xl border-2 border-white/40 bg-[#991B1B] p-6 shadow-2xl">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-[#B91C1C]">
            <AlertTriangle className="h-9 w-9" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-red-100">
              {langCfg.labels.dangerAlertTitle}
            </p>
            <h1
              id="danger-alert-heading"
              className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              {langCfg.labels.immediateReferral}
            </h1>
            <p className="mt-2 text-base font-medium leading-relaxed text-red-50">
              {langCfg.emergencyAnnouncement}
            </p>
          </div>
        </div>

        {/* Beneficiary & Detection Details */}
        <div className="mt-5 rounded-2xl bg-white p-6 text-[#0F1F24] shadow-xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-[#5C7078]">Beneficiary Reference</div>
              <div className="mt-1 text-lg font-bold text-[#0F1F24]">
                {beneficiaryName || 'Unidentified Beneficiary'}{' '}
                {beneficiaryCode ? (
                  <span className="font-mono text-sm text-[#475B62]">· {beneficiaryCode}</span>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#5C7078]">Time of Detection</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[#0F1F24]">
                {new Date(analysis.analyzedAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold text-[#5C7078]">
              Triggering Danger-Sign Categories
            </div>
            <ul className="mt-2.5 space-y-2.5">
              {analysis.matches.map((m) => (
                <li
                  key={m.code}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[#0F1F24]"
                >
                  <div className="flex items-center gap-2 font-bold text-[#991B1B]">
                    <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{m.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-700">
                    Matched spoken phrase: &ldquo;{m.matchedPhrase}&rdquo; · Guideline:{' '}
                    <span className="font-mono">{m.guidelineId}</span> ({m.guidelineSection})
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2
                className={`h-5 w-5 ${persistedOfflineOnly ? 'text-amber-600' : 'text-emerald-700'}`}
                aria-hidden="true"
              />
              <span className={persistedOfflineOnly ? 'text-amber-800' : 'text-emerald-800'}>
                {persistedOfflineOnly
                  ? 'Safety Alert Retained Locally (Offline — Pending PHC Sync)'
                  : 'Referral Status: Immediate PHC Referral Logged & Auditable'}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            Safety Guardrail: ASHA Voice Register AI does not diagnose medical conditions, prescribe
            medicines, or advise home treatment. Escort or refer the beneficiary to the Primary Health
            Centre immediately.
          </div>

          {/* Primary Emergency Actions */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onReplayAlert}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-[#B91C1C] bg-white px-5 py-3 text-base font-bold text-[#B91C1C] hover:bg-red-50"
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              Replay Voice Alert
            </button>

            <button
              type="button"
              onClick={onAcknowledgeAndReturn}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#0F1F24] px-5 py-3 text-base font-bold text-white hover:bg-[#1E333A]"
            >
              <PhoneCall className="h-5 w-5" aria-hidden="true" />
              Acknowledge &amp; View Referrals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
