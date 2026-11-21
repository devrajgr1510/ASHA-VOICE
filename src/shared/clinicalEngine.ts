import { detectDangerSigns } from './dangerSigns';
import { getLanguageConfig } from './languages';
import type {
  Beneficiary,
  CorrectionEntry,
  FollowupTask,
  LanguageCode,
  StructuredVisitRecord,
  TranscriptProvenanceSpan,
  VisitType,
} from './types';

export const NATIONAL_IMMUNISATION_SCHEDULE_V2026 = {
  version: 'NIS-2026.03',
  sourceGuidelineId: 'GOI_NIS_2026',
  milestones: [
    { ageLabel: 'At Birth', vaccines: ['BCG', 'OPV-0', 'Hepatitis B (Birth Dose)'] },
    { ageLabel: '6 Weeks', vaccines: ['OPV-1', 'Pentavalent-1', 'RVV-1', 'fIPV-1', 'PCV-1'] },
    { ageLabel: '10 Weeks', vaccines: ['OPV-2', 'Pentavalent-2', 'RVV-2'] },
    { ageLabel: '14 Weeks', vaccines: ['OPV-3', 'Pentavalent-3', 'RVV-3', 'fIPV-2', 'PCV-2'] },
    { ageLabel: '9-12 Months', vaccines: ['MR-1', 'JE-1', 'PCV-Booster', 'Vitamin A-1'] },
    { ageLabel: '16-24 Months', vaccines: ['MR-2', 'JE-2', 'DPT Booster-1', 'OPV Booster'] },
  ],
};

export const SYNTHETIC_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben-001',
    beneficiaryCode: 'ASHA00125',
    householdId: 'hh-101',
    householdCode: 'HH-101',
    locality: 'Devanahalli Ward 4',
    syntheticAddress: 'Synthetic House 14, East Lane, Devanahalli',
    displayName: 'Nandini',
    beneficiaryType: 'PREGNANT_WOMAN',
    dateOfBirth: '1999-05-14',
    motherBeneficiaryCode: null,
    syntheticDataFlag: true,
  },
  {
    id: 'ben-002',
    beneficiaryCode: 'ASHA00126',
    householdId: 'hh-102',
    householdCode: 'HH-102',
    locality: 'Devanahalli Ward 4',
    syntheticAddress: 'Synthetic House 22, Temple Road, Devanahalli',
    displayName: 'Lakshmi',
    beneficiaryType: 'PREGNANT_WOMAN',
    dateOfBirth: '2001-08-22',
    motherBeneficiaryCode: null,
    syntheticDataFlag: true,
  },
  {
    id: 'ben-003',
    beneficiaryCode: 'ASHA00127',
    householdId: 'hh-103',
    householdCode: 'HH-103',
    locality: 'Devanahalli Ward 4',
    syntheticAddress: 'Synthetic House 09, Tank Bund, Devanahalli',
    displayName: 'Baby of Rekha',
    beneficiaryType: 'NEWBORN',
    dateOfBirth: '2026-11-12',
    motherBeneficiaryCode: 'ASHA00120',
    syntheticDataFlag: true,
  },
  {
    id: 'ben-004',
    beneficiaryCode: 'ASHA00128',
    householdId: 'hh-104',
    householdCode: 'HH-104',
    locality: 'Devanahalli Ward 5',
    syntheticAddress: 'Synthetic House 31, School Street, Devanahalli',
    displayName: 'Aarav',
    beneficiaryType: 'CHILD',
    dateOfBirth: '2026-08-15',
    motherBeneficiaryCode: 'ASHA00122',
    syntheticDataFlag: true,
  },
  {
    id: 'ben-005',
    beneficiaryCode: 'ASHA00129',
    householdId: 'hh-105',
    householdCode: 'HH-105',
    locality: 'Devanahalli Ward 5',
    syntheticAddress: 'Synthetic House 05, Market Cross, Devanahalli',
    displayName: 'Kavya',
    beneficiaryType: 'PREGNANT_WOMAN',
    dateOfBirth: '1997-11-02',
    motherBeneficiaryCode: null,
    syntheticDataFlag: true,
  },
  {
    id: 'ben-006',
    beneficiaryCode: 'ASHA00130',
    householdId: 'hh-106',
    householdCode: 'HH-106',
    locality: 'Devanahalli Ward 6',
    syntheticAddress: 'Synthetic House 18, Canal Side, Devanahalli',
    displayName: 'Nandini Devi',
    beneficiaryType: 'PREGNANT_WOMAN',
    dateOfBirth: '1998-03-10',
    motherBeneficiaryCode: null,
    syntheticDataFlag: true,
  },
];

export interface BeneficiaryMatchResult {
  status: 'MATCHED' | 'AMBIGUOUS' | 'NOT_FOUND';
  matches: Beneficiary[];
}

export function matchBeneficiary(
  query: string,
  beneficiaries: Beneficiary[] = SYNTHETIC_BENEFICIARIES,
): BeneficiaryMatchResult {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return { status: 'NOT_FOUND', matches: [] };
  }

  // 1. Exact ID match inside spoken query (e.g. "ASHA00125" or "asha 00125")
  const compactQuery = normalized.replace(/\s+/g, '');
  const codeMatches = beneficiaries.filter((b) =>
    compactQuery.includes(b.beneficiaryCode.toLowerCase()),
  );
  if (codeMatches.length === 1) {
    return { status: 'MATCHED', matches: codeMatches };
  }
  if (codeMatches.length > 1) {
    return { status: 'AMBIGUOUS', matches: codeMatches };
  }

  // 2. Name matching — check all partial/full name matches so "Nandini" vs "Nandini Devi" flags ambiguity
  const partialMatches = beneficiaries.filter((b) => {
    const nameLower = b.displayName.toLowerCase();
    return (
      normalized === nameLower ||
      normalized.includes(nameLower) ||
      nameLower.includes(normalized) ||
      nameLower.split(/\s+/).some((part) => part.length >= 3 && normalized.includes(part))
    );
  });

  if (partialMatches.length === 1) {
    return { status: 'MATCHED', matches: partialMatches };
  }
  if (partialMatches.length > 1) {
    return { status: 'AMBIGUOUS', matches: partialMatches };
  }

  return { status: 'NOT_FOUND', matches: [] };
}

const MONTHS_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

export function parseSpokenDate(text: string, defaultYear = 2026): string | null {
  // ISO YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  // DD Month (YYYY)? e.g. "28 November" or "28 November 2026"
  const dmMatch = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:\s+(20\d{2}))?\b/i,
  );
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, '0');
    const month = MONTHS_MAP[dmMatch[2].toLowerCase()];
    const year = dmMatch[3] ?? String(defaultYear);
    if (month) return `${year}-${month}-${day}`;
  }
  // Month DD (YYYY)? e.g. "November 28"
  const mdMatch = text.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/i,
  );
  if (mdMatch) {
    const month = MONTHS_MAP[mdMatch[1].toLowerCase()];
    const day = mdMatch[2].padStart(2, '0');
    const year = mdMatch[3] ?? String(defaultYear);
    if (month) return `${year}-${month}-${day}`;
  }
  return null;
}

export function extractWeightKg(text: string): number | null {
  // Handle "not 3.8" correction style: ignore negated numbers first
  const cleaned = text.replace(/\b(?:not|instead of|replace)\s+\d+(?:\.\d+)?\s*(?:kg|kilo|kilos|kilogram|kilograms)?/gi, '');
  const match = cleaned.match(
    /(?:weight(?:\s+is)?|wajan|bhara|tuka)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|kilogram|kilograms)\b/i,
  );
  if (match) {
    const num = parseFloat(match[1]);
    return Number.isFinite(num) && num > 0 && num < 200 ? num : null;
  }
  return null;
}

export function inferVisitTypeFromTranscript(
  transcript: string,
  fallbackType: VisitType = 'ANC',
): VisitType {
  const lower = transcript.toLowerCase();
  if (
    /\b(newborn|baby|infant|neonate|birth weight|breastfeeding|haalu|doodh|magu|shishu)\b/.test(
      lower,
    )
  ) {
    return 'NEWBORN';
  }
  if (
    /\b(immunisation|immunization|bcg|opv|pentavalent|polio|rvv|measles|mr-1|dpt|vaccination due|missed vaccine)\b/.test(
      lower,
    ) &&
    !/\banc\b/.test(lower)
  ) {
    return 'IMMUNISATION';
  }
  if (/\b(anc|pregnant|pregnancy|gestational|ifa|td|tt injection|fetal)\b/.test(lower)) {
    return 'ANC';
  }
  return fallbackType;
}

/**
 * Deterministic rule-based clinical extractor.
 * Never fabricates missing clinical values (unknowns remain null).
 */
export function extractStructuredVisitDeterministic(params: {
  transcript: string;
  visitType?: VisitType | null;
  language: LanguageCode;
  workerId: string;
  beneficiaries?: Beneficiary[];
  selectedBeneficiary?: Beneficiary | null;
  visitDate?: string;
  clientRequestId?: string;
  extractionSource?: StructuredVisitRecord['extractionSource'];
}): StructuredVisitRecord {
  const {
    transcript,
    language,
    workerId,
    beneficiaries = SYNTHETIC_BENEFICIARIES,
    selectedBeneficiary = null,
    visitDate = new Date().toISOString().slice(0, 10),
    clientRequestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    extractionSource = 'OFFLINE_DETERMINISTIC_PARSER',
  } = params;

  const resolvedVisitType =
    params.visitType ?? inferVisitTypeFromTranscript(transcript, 'ANC');
  const lower = transcript.toLowerCase();

  let matchedBen = selectedBeneficiary;
  if (!matchedBen) {
    const m = matchBeneficiary(transcript, beneficiaries);
    if (m.status === 'MATCHED') {
      matchedBen = m.matches[0];
    }
  }

  const weightKg = extractWeightKg(transcript);
  const nextVisitMatch = transcript.match(
    /(?:next\s+(?:visit|checkup|home visit|immunisation|immunization)(?:\s+(?:on|date|is))?|follow\s*-?\s*up(?:\s+(?:on|date))?)[:\s]+([^.;\n]+)/i,
  );
  const nextVisitDate = nextVisitMatch
    ? parseSpokenDate(nextVisitMatch[1])
    : parseSpokenDate(transcript);

  const dangerAnalysis = detectDangerSigns(transcript, resolvedVisitType);
  const referralRequired = dangerAnalysis.status === 'positive_detected';

  const fieldConfidence: Record<string, number> = {
    visitType: params.visitType ? 1.0 : 0.85,
  };
  if (matchedBen) {
    fieldConfidence.beneficiaryId = 0.98;
    fieldConfidence.beneficiaryName = 0.98;
  }
  if (weightKg !== null) {
    fieldConfidence.weightKg = 0.94;
  }
  if (nextVisitDate !== null) {
    fieldConfidence.nextVisitDate = 0.91;
  }

  let pregnancyDetails: StructuredVisitRecord['pregnancyDetails'] = null;
  let newbornDetails: StructuredVisitRecord['newbornDetails'] = null;
  let immunisationDetails: StructuredVisitRecord['immunisationDetails'] = null;

  if (resolvedVisitType === 'ANC') {
    const bpMatch = transcript.match(/\b(\d{2,3}\s*\/\s*\d{2,3})\b/);
    const weeksMatch = transcript.match(/\b(\d{1,2})\s*(?:weeks|week|wks)\b/i);
    const hasIfaTaking =
      /\b(ifa|iron|folic)\b.*\b(taking|regular|togondiddare|togotiddare|kha rahi|supplied|completed)\b/i.test(
        lower,
      ) || /\b(ifa goli taking|regular aagi togondiddare)\b/i.test(lower);
    const hasIfaNotTaking = /\b(not taking ifa|ifa illa|ifa nahi)\b/i.test(lower);
    const hasTtDone =
      /\b(tt|td)\b.*\b(complete|completed|given|taken|agide|aagide|done|hogide)\b/i.test(lower);
    const hasAncDone =
      /\banc\b.*\b(complete|completed|done|agide|madidvi|checked)\b/i.test(lower);

    pregnancyDetails = {
      gestationalAgeWeeks: weeksMatch ? parseInt(weeksMatch[1], 10) : null,
      ancStatus: hasAncDone ? 'completed' : null,
      weightKg,
      bloodPressure: bpMatch ? bpMatch[1].replace(/\s+/g, '') : null,
      ifaStatus: hasIfaNotTaking ? 'not_taking' : hasIfaTaking ? 'reported_taking' : null,
      vaccinationStatus: hasTtDone ? 'reported_completed' : null,
      tdDose: hasTtDone ? 'TT/Td reported' : null,
      reportedSymptoms:
        dangerAnalysis.matches.length > 0
          ? dangerAnalysis.matches.map((m) => m.title).join('; ')
          : null,
    };
  } else if (resolvedVisitType === 'NEWBORN') {
    const feedingGood =
      /\b(feeding properly|feeding well|breastfeeding well|suckling well|haalu chennagi)\b/i.test(
        lower,
      );
    const feedingPoor =
      /\b(not feeding|poor feeding|unable to feed|inability to feed|refusing feed|kudiyutilla)\b/i.test(
        lower,
      );
    const immunChecked = /\b(vaccination record checked|immunisation checked|vaccine checked)\b/i.test(
      lower,
    );
    const tempMatch = transcript.match(/\b(\d{2,3}(?:\.\d)?\s*(?:f|c|°f|°c|fahrenheit|celsius))\b/i);

    newbornDetails = {
      newbornId: matchedBen?.beneficiaryCode ?? null,
      motherBeneficiaryId: matchedBen?.motherBeneficiaryCode ?? null,
      birthDate: matchedBen?.dateOfBirth ?? null,
      ageDays: null,
      birthWeightKg: /\bbirth weight\b/i.test(lower) ? weightKg : null,
      currentWeightKg: !/\bbirth weight\b/i.test(lower) ? weightKg : null,
      feedingObservations: feedingPoor
        ? 'Not feeding / poor feeding reported'
        : feedingGood
          ? 'Feeding properly'
          : null,
      reportedTemperature: tempMatch ? tempMatch[1] : null,
      immunisationChecked: immunChecked ? true : null,
    };
  } else if (resolvedVisitType === 'IMMUNISATION') {
    const vaccineTokens = [
      'BCG',
      'OPV-0',
      'OPV-1',
      'OPV-2',
      'OPV-3',
      'OPV',
      'Pentavalent-1',
      'Pentavalent-2',
      'Pentavalent-3',
      'Pentavalent',
      'RVV-1',
      'RVV-2',
      'fIPV-1',
      'PCV-1',
      'MR-1',
      'MR-2',
      'JE-1',
      'DPT',
    ];
    const vaccinesGiven: string[] = [];
    const vaccinesDue: string[] = [];
    const clauses = transcript
      .split(/[.;\n]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    for (const clause of clauses) {
      const clauseHasDue = /\b(due|pending|missed|next)\b/i.test(clause);
      const clauseHasGiven = /\b(given|administered|completed|done|taken)\b/i.test(clause);

      for (const v of vaccineTokens) {
        // Avoid generic "OPV" or "Pentavalent" if specific dose like "OPV-1" is in the same clause
        if (
          (v === 'OPV' && /\bOPV-\d\b/i.test(clause)) ||
          (v === 'Pentavalent' && /\bPentavalent-\d\b/i.test(clause))
        ) {
          continue;
        }
        const vRegex = new RegExp(`\\b${v}\\b`, 'i');
        if (vRegex.test(clause)) {
          if (clauseHasDue && !clauseHasGiven) {
            if (!vaccinesDue.includes(v)) vaccinesDue.push(v);
          } else {
            if (!vaccinesGiven.includes(v)) vaccinesGiven.push(v);
          }
        }
      }
    }

    immunisationDetails = {
      childAgeLabel: null,
      vaccinesGiven,
      vaccinesDue,
      missedVaccines: [],
      previousVaccineHistory: null,
      scheduleVersion: NATIONAL_IMMUNISATION_SCHEDULE_V2026.version,
    };
  }

  return {
    clientRequestId,
    beneficiaryId: matchedBen?.beneficiaryCode ?? null,
    beneficiaryName: matchedBen?.displayName ?? null,
    householdId: matchedBen?.householdCode ?? null,
    workerId,
    visitType: resolvedVisitType,
    visitDate,
    language,
    detectedLanguages: [language === 'en' ? 'English' : language],
    observations: transcript.trim(),
    pregnancyDetails,
    newbornDetails,
    immunisationDetails,
    nextVisitDate,
    dangerSignStatus: dangerAnalysis.status,
    dangerAnalysis,
    referralStatus: referralRequired ? 'immediate_phc_required' : 'not_required',
    confirmationStatus: referralRequired ? 'emergency_unconfirmed' : 'pending_confirmation',
    sourceTranscript: transcript.trim(),
    extractionSource,
    fieldConfidence,
    originalUtterances: {
      fullTranscript: transcript.trim(),
    },
    correctionHistory: [],
  };
}

export interface VoiceCorrectionOutcome {
  action: 'REPEAT_RECORD' | 'UPDATED_FIELD' | 'CONFIRM_SAVE' | 'NEEDS_CLARIFICATION';
  updatedField: string | null;
  updatedRecord: StructuredVisitRecord;
  spokenFeedback: string;
}

/**
 * Applies a natural-language voice correction while preserving all other confirmed fields.
 */
export function applyVoiceCorrection(
  record: StructuredVisitRecord,
  correctionText: string,
  beneficiaries: Beneficiary[] = SYNTHETIC_BENEFICIARIES,
): VoiceCorrectionOutcome {
  const lower = correctionText.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  if (/\b(yes|save|confirm|correct|ok save|houdhu|haan|aama|avunu)\b/.test(lower) && !/\bno\b/.test(lower)) {
    return {
      action: 'CONFIRM_SAVE',
      updatedField: null,
      updatedRecord: {
        ...record,
        confirmationStatus: 'confirmed',
      },
      spokenFeedback: 'Confirmed. Saving visit record.',
    };
  }

  if (/\b(repeat|read again|say again|listen again|matte heli|dobara)\b/.test(lower)) {
    return {
      action: 'REPEAT_RECORD',
      updatedField: null,
      updatedRecord: record,
      spokenFeedback: buildReadBackScript(record, record.language),
    };
  }

  const nextRecord: StructuredVisitRecord = structuredClone(record);
  const addCorrection = (fieldName: string, prev: string | null, next: string | null) => {
    const entry: CorrectionEntry = {
      fieldName,
      previousValue: prev,
      correctedValue: next,
      correctionSource: 'VOICE_CORRECTION',
      correctedAt: nowIso,
    };
    nextRecord.correctionHistory.push(entry);
  };

  // 1. Weight correction (e.g. "No, weight is 2.8 kilo, not 3.8.")
  const newWeight = extractWeightKg(correctionText);
  if (newWeight !== null || /\bweight\b|\bwajan\b|\bbhara\b/.test(lower)) {
    if (newWeight !== null) {
      if (nextRecord.visitType === 'ANC' && nextRecord.pregnancyDetails) {
        const prev = nextRecord.pregnancyDetails.weightKg;
        nextRecord.pregnancyDetails.weightKg = newWeight;
        nextRecord.fieldConfidence.weightKg = 0.99;
        addCorrection('weightKg', prev !== null ? String(prev) : null, String(newWeight));
        return {
          action: 'UPDATED_FIELD',
          updatedField: 'weightKg',
          updatedRecord: nextRecord,
          spokenFeedback: `Updated weight to ${newWeight} kilograms. Should I save this visit record?`,
        };
      }
      if (nextRecord.visitType === 'NEWBORN' && nextRecord.newbornDetails) {
        const prev = nextRecord.newbornDetails.currentWeightKg;
        nextRecord.newbornDetails.currentWeightKg = newWeight;
        nextRecord.fieldConfidence.weightKg = 0.99;
        addCorrection('currentWeightKg', prev !== null ? String(prev) : null, String(newWeight));
        return {
          action: 'UPDATED_FIELD',
          updatedField: 'currentWeightKg',
          updatedRecord: nextRecord,
          spokenFeedback: `Updated baby weight to ${newWeight} kilograms. Should I save this visit record?`,
        };
      }
    }
    return {
      action: 'NEEDS_CLARIFICATION',
      updatedField: null,
      updatedRecord: record,
      spokenFeedback: 'Please speak the exact weight value in kilograms.',
    };
  }

  // 2. Next visit date correction
  const newDate = parseSpokenDate(correctionText);
  if (newDate !== null || /\b(next visit|date|follow ?up)\b/.test(lower)) {
    if (newDate !== null) {
      const prev = nextRecord.nextVisitDate;
      nextRecord.nextVisitDate = newDate;
      nextRecord.fieldConfidence.nextVisitDate = 0.99;
      addCorrection('nextVisitDate', prev, newDate);
      return {
        action: 'UPDATED_FIELD',
        updatedField: 'nextVisitDate',
        updatedRecord: nextRecord,
        spokenFeedback: `Updated next visit date to ${newDate}. Should I save this visit record?`,
      };
    }
    return {
      action: 'NEEDS_CLARIFICATION',
      updatedField: null,
      updatedRecord: record,
      spokenFeedback: 'Please repeat the next visit date clearly, for example 28 November.',
    };
  }

  // 3. Beneficiary ID / name correction
  if (/\b(beneficiary|id|name|asha0)\b/.test(lower)) {
    const match = matchBeneficiary(correctionText, beneficiaries);
    if (match.status === 'MATCHED') {
      const ben = match.matches[0];
      const prev = `${nextRecord.beneficiaryId ?? ''} ${nextRecord.beneficiaryName ?? ''}`.trim();
      nextRecord.beneficiaryId = ben.beneficiaryCode;
      nextRecord.beneficiaryName = ben.displayName;
      nextRecord.householdId = ben.householdCode;
      addCorrection('beneficiaryId', prev || null, `${ben.beneficiaryCode} (${ben.displayName})`);
      return {
        action: 'UPDATED_FIELD',
        updatedField: 'beneficiaryId',
        updatedRecord: nextRecord,
        spokenFeedback: `Updated beneficiary to ${ben.displayName}, ID ${ben.beneficiaryCode}. Should I save this visit record?`,
      };
    }
  }

  // 4. Re-check danger signs if correction mentions symptoms
  const dangerReCheck = detectDangerSigns(correctionText, nextRecord.visitType);
  if (dangerReCheck.status === 'positive_detected') {
    nextRecord.dangerSignStatus = 'positive_detected';
    nextRecord.dangerAnalysis = dangerReCheck;
    nextRecord.referralStatus = 'immediate_phc_required';
    return {
      action: 'UPDATED_FIELD',
      updatedField: 'dangerSignStatus',
      updatedRecord: nextRecord,
      spokenFeedback: getLanguageConfig(nextRecord.language).emergencyAnnouncement,
    };
  }

  return {
    action: 'NEEDS_CLARIFICATION',
    updatedField: null,
    updatedRecord: record,
    spokenFeedback: 'Which field would you like to change? You can say weight, next visit date, beneficiary ID, or say yes to save.',
  };
}

export function buildReadBackScript(
  record: StructuredVisitRecord,
  language: LanguageCode,
): string {
  const langCfg = getLanguageConfig(language);
  const parts: string[] = [];

  if (record.dangerSignStatus === 'positive_detected') {
    return langCfg.emergencyAnnouncement;
  }

  parts.push('I have recorded the following visit.');
  if (record.beneficiaryName) parts.push(`Beneficiary name: ${record.beneficiaryName}.`);
  if (record.beneficiaryId) parts.push(`Beneficiary ID: ${record.beneficiaryId}.`);

  const visitLabel =
    record.visitType === 'ANC'
      ? 'Pregnancy checkup'
      : record.visitType === 'NEWBORN'
        ? 'Newborn home visit'
        : 'Immunisation visit';
  parts.push(`Visit type: ${visitLabel}.`);

  if (record.visitType === 'ANC' && record.pregnancyDetails) {
    if (record.pregnancyDetails.weightKg !== null) {
      parts.push(`Weight: ${record.pregnancyDetails.weightKg} kilograms.`);
    }
    if (record.pregnancyDetails.ifaStatus) {
      parts.push(`IFA status: ${record.pregnancyDetails.ifaStatus.replace(/_/g, ' ')}.`);
    }
    if (record.pregnancyDetails.vaccinationStatus) {
      parts.push(`Vaccination: ${record.pregnancyDetails.vaccinationStatus.replace(/_/g, ' ')}.`);
    }
  }

  if (record.visitType === 'NEWBORN' && record.newbornDetails) {
    const wt = record.newbornDetails.currentWeightKg ?? record.newbornDetails.birthWeightKg;
    if (wt !== null) parts.push(`Baby weight: ${wt} kilograms.`);
    if (record.newbornDetails.feedingObservations) {
      parts.push(`Feeding: ${record.newbornDetails.feedingObservations}.`);
    }
    if (record.newbornDetails.immunisationChecked) {
      parts.push('Immunisation record checked.');
    }
  }

  if (record.visitType === 'IMMUNISATION' && record.immunisationDetails) {
    if (record.immunisationDetails.vaccinesGiven.length > 0) {
      parts.push(`Vaccines given: ${record.immunisationDetails.vaccinesGiven.join(', ')}.`);
    }
    if (record.immunisationDetails.vaccinesDue.length > 0) {
      parts.push(`Vaccines due: ${record.immunisationDetails.vaccinesDue.join(', ')}.`);
    }
  }

  if (record.nextVisitDate) {
    parts.push(`Next visit: ${record.nextVisitDate}.`);
  }

  parts.push(langCfg.savePromptTemplate);
  return parts.join(' ');
}

export function generateFollowUpsFromRecord(
  visitId: string,
  record: StructuredVisitRecord,
): Omit<FollowupTask, 'id' | 'createdAt'>[] {
  const tasks: Omit<FollowupTask, 'id' | 'createdAt'>[] = [];
  const benId = record.beneficiaryId ?? 'UNASSIGNED';

  if (record.dangerSignStatus === 'positive_detected') {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: `Immediate PHC referral follow-up for detected danger sign: ${record.dangerAnalysis.matches
        .map((m) => m.title)
        .join(', ')}`,
      priority: 'IMMEDIATE_REFERRAL',
      dueDate: record.visitDate,
      taskStatus: 'PENDING',
    });
  }

  if (record.nextVisitDate) {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: `Scheduled ${record.visitType} follow-up visit confirmed by ASHA worker.`,
      priority: 'SCHEDULED_VISIT',
      dueDate: record.nextVisitDate,
      taskStatus: 'PENDING',
    });
  } else {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: 'Next visit date not yet confirmed — collect date with beneficiary.',
      priority: 'PENDING_INFORMATION',
      dueDate: null,
      taskStatus: 'PENDING',
    });
  }

  if (record.visitType === 'ANC' && record.pregnancyDetails) {
    if (!record.pregnancyDetails.bloodPressure) {
      tasks.push({
        visitId,
        beneficiaryId: benId,
        beneficiaryName: record.beneficiaryName ?? undefined,
        beneficiaryCode: record.beneficiaryId ?? undefined,
        taskDescription: 'Track reported ANC follow-up status and blood pressure check at ANM/PHC.',
        priority: 'ROUTINE_FOLLOWUP',
        dueDate: record.nextVisitDate,
        taskStatus: 'PENDING',
      });
    }
    if (record.pregnancyDetails.vaccinationStatus) {
      tasks.push({
        visitId,
        beneficiaryId: benId,
        beneficiaryName: record.beneficiaryName ?? undefined,
        beneficiaryCode: record.beneficiaryId ?? undefined,
        taskDescription: `Review recorded Td/TT vaccination status (${record.pregnancyDetails.vaccinationStatus.replace(/_/g, ' ')}).`,
        priority: 'ROUTINE_FOLLOWUP',
        dueDate: record.nextVisitDate,
        taskStatus: 'PENDING',
      });
    }
  }

  if (record.visitType === 'NEWBORN' && record.newbornDetails) {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: 'Check newborn immunisation follow-up and weight progression.',
      priority: 'ROUTINE_FOLLOWUP',
      dueDate: record.nextVisitDate,
      taskStatus: 'PENDING',
    });
  }

  if (
    record.visitType === 'IMMUNISATION' &&
    record.immunisationDetails &&
    record.immunisationDetails.vaccinesDue.length > 0
  ) {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: `Administer due vaccines per ${record.immunisationDetails.scheduleVersion}: ${record.immunisationDetails.vaccinesDue.join(', ')}`,
      priority: 'SCHEDULED_VISIT',
      dueDate: record.nextVisitDate,
      taskStatus: 'PENDING',
    });
  }

  return tasks;
}

/**
 * Computes exact substring provenance spans inside the transcript for interactive DOM binding
 * between extracted clinical fields and source spoken utterances.
 */
export function computeFieldProvenanceSpans(
  transcript: string,
  record: StructuredVisitRecord | null,
): TranscriptProvenanceSpan[] {
  if (!transcript || !record) return [];

  const spans: TranscriptProvenanceSpan[] = [];
  const lower = transcript.toLowerCase();

  const tryAdd = (fieldName: string, label: string, regex: RegExp, confidence = 0.92) => {
    const m = transcript.match(regex);
    if (!m || m.index === undefined) return;
    const startIndex = m.index;
    const endIndex = startIndex + m[0].length;
    spans.push({
      fieldName,
      label,
      matchedText: m[0],
      startIndex,
      endIndex,
      confidence,
    });
  };

  if (record.beneficiaryId) {
    const esc = record.beneficiaryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    tryAdd('beneficiaryId', 'Beneficiary ID', new RegExp(esc, 'i'), record.fieldConfidence.beneficiaryId ?? 0.98);
  }
  if (record.beneficiaryName) {
    const esc = record.beneficiaryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    tryAdd('beneficiaryName', 'Beneficiary Name', new RegExp(`\\b${esc}\\b`, 'i'), record.fieldConfidence.beneficiaryName ?? 0.96);
  }

  const wt =
    record.pregnancyDetails?.weightKg ??
    record.newbornDetails?.currentWeightKg ??
    record.newbornDetails?.birthWeightKg;
  if (wt !== null && wt !== undefined) {
    const wtEsc = String(wt).replace('.', '\\.');
    tryAdd(
      record.visitType === 'NEWBORN' ? 'currentWeightKg' : 'weightKg',
      'Weight',
      new RegExp(`(?:weight(?:\\s+is)?\\s*)?${wtEsc}\\s*(?:kg|kilo|kilos|kilogram|kilograms)\\b`, 'i'),
      record.fieldConfidence.weightKg ?? 0.94,
    );
  }

  if (record.pregnancyDetails?.bloodPressure) {
    const bpEsc = record.pregnancyDetails.bloodPressure.replace('/', '\\s*\\/\\s*');
    tryAdd('bloodPressure', 'Blood Pressure', new RegExp(`\\b${bpEsc}\\b`, 'i'), 0.94);
  }

  if (record.pregnancyDetails?.ifaStatus) {
    tryAdd(
      'ifaStatus',
      'IFA Tablets',
      /\b(?:ifa|iron|folic)(?:\s+goli|\s+tablets)?(?:\s+(?:taking|regular(?:\s+aagi)?(?:\s+togondiddare)?|not taking|illa|nahi))?/i,
      0.91,
    );
  }

  if (record.pregnancyDetails?.vaccinationStatus) {
    tryAdd(
      'vaccinationStatus',
      'Td/TT Vaccine',
      /\b(?:tt|td)(?:\s+injection)?(?:\s+(?:complete(?:\s+agide)?|completed|given|taken|done))?/i,
      0.9,
    );
  }

  if (record.newbornDetails?.feedingObservations) {
    tryAdd(
      'feedingObservations',
      'Feeding',
      /\b(?:baby\s+is\s+)?(?:feeding\s+properly|feeding\s+well|breastfeeding\s+well|not\s+feeding|poor\s+feeding|unable\s+to\s+feed)\b/i,
      0.92,
    );
  }

  if (record.newbornDetails?.immunisationChecked) {
    tryAdd(
      'immunisationChecked',
      'Immunisation Record',
      /\b(?:vaccination\s+record\s+checked|immunisation\s+checked|vaccine\s+checked)\b/i,
      0.92,
    );
  }

  if (record.immunisationDetails) {
    for (const v of record.immunisationDetails.vaccinesGiven) {
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tryAdd('vaccinesGiven', 'Vaccine Given', new RegExp(`\\b${esc}\\b`, 'i'), 0.95);
    }
    for (const v of record.immunisationDetails.vaccinesDue) {
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tryAdd('vaccinesDue', 'Vaccine Due', new RegExp(`\\b${esc}\\b`, 'i'), 0.93);
    }
  }

  if (record.nextVisitDate) {
    tryAdd(
      'nextVisitDate',
      'Next Visit Date',
      /(?:next\s+(?:visit|checkup|home visit|immunisation)(?:\s+(?:on|date|is))?|follow\s*-?\s*up(?:\s+(?:on|date))?)[:\s]+\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+(?:\s+\d{4})?|\b20\d{2}-\d{1,2}-\d{1,2}\b/i,
      record.fieldConfidence.nextVisitDate ?? 0.91,
    );
  }

  for (const match of record.dangerAnalysis.matches) {
    if (match.matchedPhrase && lower.includes(match.matchedPhrase.toLowerCase())) {
      const esc = match.matchedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tryAdd('dangerSignStatus', `Danger Sign: ${match.title}`, new RegExp(esc, 'i'), match.confidence);
    }
  }

  // Sort by position and remove overlaps so DOM rendering stays clean and non-duplicated
  spans.sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);
  const nonOverlapping: TranscriptProvenanceSpan[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.startIndex >= cursor) {
      nonOverlapping.push(s);
      cursor = s.endIndex;
    }
  }
  return nonOverlapping;
}

