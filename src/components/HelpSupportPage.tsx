import React from 'react';
import { BookOpen, HelpCircle, Mic, Play, ShieldAlert, WifiOff } from 'lucide-react';
import { APPROVED_DANGER_SIGN_RULES } from '../shared/dangerSigns';
import type { VisitType } from '../shared/types';

interface HelpSupportPageProps {
  onLaunchScenario: (transcript: string, visitType: VisitType, beneficiaryCode: string | null) => void;
}

const DEMO_WORKFLOW_SCENARIOS: Array<{
  id: string;
  title: string;
  visitType: VisitType;
  beneficiaryCode: string;
  transcript: string;
}> = [
  {
    id: 'help-s1',
    title: 'Pregnancy ANC Routine Visit (Nandini · ASHA00125)',
    visitType: 'ANC',
    beneficiaryCode: 'ASHA00125',
    transcript:
      'Today I visited beneficiary ASHA00125, Nandini. ANC checkup completed. Weight is 52 kilo. IFA goli taking. Next visit on 28 November.',
  },
  {
    id: 'help-s2',
    title: 'Newborn HBNC Visit (Baby of Rekha · ASHA00127)',
    visitType: 'NEWBORN',
    beneficiaryCode: 'ASHA00127',
    transcript: 'Baby weight 2.8 kilo, baby is feeding properly, vaccination record checked.',
  },
  {
    id: 'help-s7',
    title: 'Kannada-English Code-Mixed ANC Visit',
    visitType: 'ANC',
    beneficiaryCode: 'ASHA00125',
    transcript:
      'Today Nandini ASHA00125 avarige ANC checkup agide, weight 52 kilo ide, IFA goli regular aagi togondiddare, TT injection complete agide.',
  },
  {
    id: 'help-s10',
    title: 'Child Immunisation Schedule (Aarav · ASHA00128)',
    visitType: 'IMMUNISATION',
    beneficiaryCode: 'ASHA00128',
    transcript:
      'Aarav ASHA00128 immunisation visit. OPV-1 and Pentavalent-1 given today. PCV-1 due. Next visit on 18 December.',
  },
];

export const HelpSupportPage: React.FC<HelpSupportPageProps> = ({ onLaunchScenario }) => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="border-b border-[#E7EDF2] pb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#087F75]" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-[#172B3A]">
              ASHA Worker Guide &amp; Clinical Safety Reference
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#718096]">
            Step-by-step instructions for voice registration, offline field syncing, and official
            NHM danger-sign escalation protocols.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
            <Mic className="h-5 w-5 text-[#087F75]" aria-hidden="true" />
            <h3 className="mt-2 font-display text-sm font-bold text-[#172B3A]">
              1. Speak Naturally
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#718096]">
              Tap the microphone in Voice Visit and speak in Kannada, Hindi, Tamil, Telugu, or mix
              with English medical words like weight, IFA, BP, or OPV-1. Pause or Resume anytime.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
            <ShieldAlert className="h-5 w-5 text-[#D94B4B]" aria-hidden="true" />
            <h3 className="mt-2 font-display text-sm font-bold text-[#172B3A]">
              2. Verify &amp; Correct by Voice
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#718096]">
              Hover any auto-filled field to see its exact spoken source in the transcript. Listen to
              the read-back and interrupt anytime to correct a number or date before saving.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
            <WifiOff className="h-5 w-5 text-[#F4A340]" aria-hidden="true" />
            <h3 className="mt-2 font-display text-sm font-bold text-[#172B3A]">
              3. Offline Safety Net
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#718096]">
              When mobile signal drops, confirmed visits and danger alerts are preserved locally in
              the browser queue and synced automatically with idempotency protection once online.
            </p>
          </div>
        </div>

        {/* Interactive Demo Scenarios Launcher */}
        <div className="mt-6 border-t border-[#E7EDF2] pt-5">
          <h3 className="font-display text-sm font-bold text-[#172B3A]">
            Interactive Training &amp; Benchmark Scenarios
          </h3>
          <p className="mt-0.5 text-xs text-[#718096]">
            Launch a realistic field utterance directly into the Voice Visit AI extraction and
            read-back pipeline:
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {DEMO_WORKFLOW_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => onLaunchScenario(sc.transcript, sc.visitType, sc.beneficiaryCode)}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5 text-left transition-colors hover:border-[#087F75] hover:bg-[#E8F7F1]/50"
              >
                <div>
                  <div className="text-xs font-bold text-[#087F75]">{sc.title}</div>
                  <div className="mt-1 text-xs text-[#718096]">&ldquo;{sc.transcript}&rdquo;</div>
                </div>
                <Play className="mt-1 h-4 w-4 shrink-0 text-[#10A77A]" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        {/* Approved Danger Sign Reference */}
        <div className="mt-6 border-t border-[#E7EDF2] pt-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold text-[#172B3A]">
              Approved NHM / GoI Danger-Sign Screening Rules ({APPROVED_DANGER_SIGN_RULES.length}{' '}
              Deterministic Rules)
            </h3>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {APPROVED_DANGER_SIGN_RULES.map((rule) => (
              <div
                key={rule.code}
                className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#172B3A]">{rule.title}</span>
                  <span className="font-mono text-[10px] font-semibold text-[#087F75]">
                    {rule.category} · {rule.guidelineId}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-[#718096]">{rule.guidelineSection}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
