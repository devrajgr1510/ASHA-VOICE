import type { StructuredVisitRecord, VisitType } from './types';

export interface QuestionGuideItem {
  id: string;
  visitType: VisitType;
  categoryLabel: string;
  question: string;
  hint: string;
  mappedField: string;
  spokenPrompt: string;
  matchKeywords: string[];
  isAnswered: (record: StructuredVisitRecord | null, transcript: string) => boolean;
}

export const QUESTION_GUIDES: QuestionGuideItem[] = [
  // Pregnancy & ANC
  {
    id: 'anc-ben',
    visitType: 'ANC',
    categoryLabel: 'Identification',
    question: 'Confirm pregnant woman name and ASHA beneficiary ID',
    hint: 'Speak the beneficiary ID (e.g. ASHA00125) or full name',
    mappedField: 'beneficiaryId',
    spokenPrompt: 'Please state the pregnant woman name and her ASHA beneficiary ID.',
    matchKeywords: ['asha', 'nandini', 'lakshmi', 'kavya', 'beneficiary'],
    isAnswered: (r) => Boolean(r?.beneficiaryId),
  },
  {
    id: 'anc-checkup',
    visitType: 'ANC',
    categoryLabel: 'ANC Checkup',
    question: 'Was the routine ANC checkup completed and gestational age recorded?',
    hint: 'Mention ANC status and weeks of pregnancy if known',
    mappedField: 'ancStatus',
    spokenPrompt: 'Was the antenatal checkup completed today, and how many weeks pregnant is she?',
    matchKeywords: ['anc', 'checkup', 'weeks', 'gestational', 'pregnant'],
    isAnswered: (r) => Boolean(r?.pregnancyDetails?.ancStatus || r?.pregnancyDetails?.gestationalAgeWeeks),
  },
  {
    id: 'anc-weight-bp',
    visitType: 'ANC',
    categoryLabel: 'Vitals',
    question: 'Record mother weight (kg) and blood pressure (mmHg)',
    hint: 'Example: Weight 52 kilo, BP 118/76',
    mappedField: 'weightKg',
    spokenPrompt: 'What is the mother current weight in kilograms and blood pressure reading?',
    matchKeywords: ['weight', 'kilo', 'kg', 'bp', 'blood pressure'],
    isAnswered: (r) => Boolean(r?.pregnancyDetails?.weightKg !== null && r?.pregnancyDetails?.weightKg !== undefined),
  },
  {
    id: 'anc-ifa-td',
    visitType: 'ANC',
    categoryLabel: 'Supplements & Vaccine',
    question: 'Check regular intake of IFA tablets and Td/TT vaccination status',
    hint: 'Example: IFA goli taking regularly, TT injection completed',
    mappedField: 'ifaStatus',
    spokenPrompt: 'Is she taking her iron folic acid tablets regularly, and has she received her Td vaccination?',
    matchKeywords: ['ifa', 'iron', 'folic', 'goli', 'tt', 'td', 'vaccine'],
    isAnswered: (r) => Boolean(r?.pregnancyDetails?.ifaStatus || r?.pregnancyDetails?.vaccinationStatus),
  },
  {
    id: 'anc-danger',
    visitType: 'ANC',
    categoryLabel: 'Safety Screening',
    question: 'Screen for NHM danger signs (bleeding, severe headache, swelling, fever, convulsions)',
    hint: 'Explicitly mention absence or presence (e.g. no bleeding)',
    mappedField: 'dangerSignStatus',
    spokenPrompt: 'Ask if she has any vaginal bleeding, severe headache, blurred vision, high fever, or convulsions.',
    matchKeywords: ['bleeding', 'fever', 'headache', 'swelling', 'convulsion', 'seizure', 'blur'],
    isAnswered: (r, t) =>
      Boolean(
        r &&
          (r.dangerSignStatus !== 'none_detected' ||
            r.dangerAnalysis.negatedMatches.length > 0 ||
            /\b(no bleeding|bleeding illa|no danger|normal|fine)\b/i.test(t)),
      ),
  },
  {
    id: 'anc-next-date',
    visitType: 'ANC',
    categoryLabel: 'Follow-up',
    question: 'Confirm the next ANC home visit or PHC checkup date',
    hint: 'Example: Next visit on 28 November',
    mappedField: 'nextVisitDate',
    spokenPrompt: 'When is the next scheduled antenatal visit date?',
    matchKeywords: ['next visit', 'follow up', 'november', 'december', 'january'],
    isAnswered: (r) => Boolean(r?.nextVisitDate),
  },

  // Newborn Care (HBNC)
  {
    id: 'nb-ben',
    visitType: 'NEWBORN',
    categoryLabel: 'Identification',
    question: 'Confirm newborn ID and mother reference',
    hint: 'Example: ASHA00127 Baby of Rekha',
    mappedField: 'beneficiaryId',
    spokenPrompt: 'Please confirm the newborn beneficiary ID and mother name.',
    matchKeywords: ['baby', 'newborn', 'asha', 'rekha'],
    isAnswered: (r) => Boolean(r?.beneficiaryId),
  },
  {
    id: 'nb-weight',
    visitType: 'NEWBORN',
    categoryLabel: 'Anthropometry',
    question: 'Measure and record newborn current weight (or birth weight) in kg',
    hint: 'Example: Baby weight 2.8 kilo',
    mappedField: 'currentWeightKg',
    spokenPrompt: 'What is the newborn baby current weight in kilograms?',
    matchKeywords: ['weight', 'kilo', 'kg', 'birth weight'],
    isAnswered: (r) =>
      Boolean(r?.newbornDetails?.currentWeightKg !== null && r?.newbornDetails?.currentWeightKg !== undefined) ||
      Boolean(r?.newbornDetails?.birthWeightKg !== null && r?.newbornDetails?.birthWeightKg !== undefined),
  },
  {
    id: 'nb-feeding',
    visitType: 'NEWBORN',
    categoryLabel: 'Feeding',
    question: 'Observe breastfeeding attachment and frequency (feeding properly vs poor feeding)',
    hint: 'Example: Baby is feeding properly',
    mappedField: 'feedingObservations',
    spokenPrompt: 'Is the newborn breastfeeding well and taking feeds regularly?',
    matchKeywords: ['feeding', 'breastfeeding', 'haalu', 'milk', 'suckling'],
    isAnswered: (r) => Boolean(r?.newbornDetails?.feedingObservations),
  },
  {
    id: 'nb-danger',
    visitType: 'NEWBORN',
    categoryLabel: 'Newborn Safety',
    question: 'Check temperature, breathing difficulty, lethargy, umbilical cord, and feeding refusal',
    hint: 'High fever or not feeding triggers immediate PHC alert',
    mappedField: 'dangerSignStatus',
    spokenPrompt: 'Check if the baby has fever, cold skin, fast breathing, chest indrawing, or inability to feed.',
    matchKeywords: ['fever', 'temperature', 'breathing', 'cord', 'lethargic', 'not feeding'],
    isAnswered: (r, t) =>
      Boolean(
        r &&
          (r.dangerSignStatus !== 'none_detected' ||
            r.dangerAnalysis.negatedMatches.length > 0 ||
            Boolean(r.newbornDetails?.reportedTemperature) ||
            /\b(no fever|normal temperature|active)\b/i.test(t)),
      ),
  },
  {
    id: 'nb-imm',
    visitType: 'NEWBORN',
    categoryLabel: 'Birth Vaccines',
    question: 'Verify BCG, OPV-0, and Hepatitis B birth dose immunisation record',
    hint: 'Example: Vaccination record checked',
    mappedField: 'immunisationChecked',
    spokenPrompt: 'Have you checked the newborn birth vaccination record card?',
    matchKeywords: ['vaccination', 'immunisation', 'bcg', 'opv', 'card'],
    isAnswered: (r) => r?.newbornDetails?.immunisationChecked === true,
  },

  // Child Immunisation
  {
    id: 'imm-ben',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Child Identity',
    question: 'Confirm child beneficiary ID and name',
    hint: 'Example: Aarav ASHA00128',
    mappedField: 'beneficiaryId',
    spokenPrompt: 'Please state the child name and beneficiary ID.',
    matchKeywords: ['aarav', 'child', 'asha'],
    isAnswered: (r) => Boolean(r?.beneficiaryId),
  },
  {
    id: 'imm-given',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Administered Today',
    question: 'Record all vaccines administered today (BCG, OPV, Pentavalent, RVV, fIPV, PCV, MR)',
    hint: 'Example: OPV-1 and Pentavalent-1 given today',
    mappedField: 'vaccinesGiven',
    spokenPrompt: 'Which vaccines were given to the child during this session?',
    matchKeywords: ['given', 'administered', 'bcg', 'opv', 'pentavalent', 'pcv', 'rvv', 'mr'],
    isAnswered: (r) => Boolean(r?.immunisationDetails && r.immunisationDetails.vaccinesGiven.length > 0),
  },
  {
    id: 'imm-due',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Upcoming / Due',
    question: 'Identify any vaccines due or missed per NIS 2026 schedule',
    hint: 'Example: PCV-1 due',
    mappedField: 'vaccinesDue',
    spokenPrompt: 'Are any vaccines due or missed according to the National Immunisation Schedule?',
    matchKeywords: ['due', 'missed', 'pending', 'pcv', 'schedule'],
    isAnswered: (r) =>
      Boolean(
        r?.immunisationDetails &&
          (r.immunisationDetails.vaccinesDue.length > 0 || r.immunisationDetails.missedVaccines.length > 0),
      ),
  },
  {
    id: 'imm-next',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Next Session',
    question: 'Schedule the next immunisation session date',
    hint: 'Example: Next visit on 18 December',
    mappedField: 'nextVisitDate',
    spokenPrompt: 'When is the child next scheduled immunisation visit?',
    matchKeywords: ['next visit', 'december', 'january', 'session'],
    isAnswered: (r) => Boolean(r?.nextVisitDate),
  },
];
