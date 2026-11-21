import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyVoiceCorrection,
  extractStructuredVisitDeterministic,
  generateFollowUpsFromRecord,
  matchBeneficiary,
  SYNTHETIC_BENEFICIARIES,
} from './clinicalEngine';

test('matches synthetic beneficiary by exact code ASHA00125', () => {
  const result = matchBeneficiary('Today I visited beneficiary ASHA00125, Nandini.', SYNTHETIC_BENEFICIARIES);
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.matches[0]?.beneficiaryCode, 'ASHA00125');
  assert.equal(result.matches[0]?.displayName, 'Nandini');
});

test('returns AMBIGUOUS when multiple beneficiaries share a name fragment', () => {
  const result = matchBeneficiary('Nandini', SYNTHETIC_BENEFICIARIES);
  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.matches.length, 2);
});

test('extracts Scenario 1 pregnancy visit accurately without inventing missing fields', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Today I visited beneficiary ASHA00125, Nandini. ANC checkup completed. Weight is 52 kilo. IFA goli taking. Next visit on 28 November.',
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
    visitDate: '2026-11-21',
  });

  assert.equal(record.beneficiaryId, 'ASHA00125');
  assert.equal(record.beneficiaryName, 'Nandini');
  assert.equal(record.pregnancyDetails?.weightKg, 52);
  assert.equal(record.pregnancyDetails?.ifaStatus, 'reported_taking');
  assert.equal(record.pregnancyDetails?.ancStatus, 'completed');
  assert.equal(record.pregnancyDetails?.bloodPressure, null); // Never invented
  assert.equal(record.nextVisitDate, '2026-11-28');
  assert.equal(record.dangerSignStatus, 'none_detected');
});

test('extracts Scenario 7 Kannada-English code-mixed visit', () => {
  const record = extractStructuredVisitDeterministic({
    transcript: 'Today Nandini ASHA00125 avarige ANC checkup agide, weight 52 kilo ide, IFA goli regular aagi togondiddare, TT injection complete agide.',
    visitType: 'ANC',
    language: 'kn',
    workerId: 'WORKER001',
  });
  assert.equal(record.beneficiaryId, 'ASHA00125');
  assert.equal(record.pregnancyDetails?.weightKg, 52);
  assert.equal(record.pregnancyDetails?.ifaStatus, 'reported_taking');
  assert.equal(record.pregnancyDetails?.vaccinationStatus, 'reported_completed');
});

test('applies Scenario 3 voice correction updating only weight while preserving other fields', () => {
  const initial = extractStructuredVisitDeterministic({
    transcript: 'Baby weight 3.8 kilo, baby is feeding properly, vaccination record checked.',
    visitType: 'NEWBORN',
    language: 'en',
    workerId: 'WORKER001',
    selectedBeneficiary: SYNTHETIC_BENEFICIARIES[2],
  });
  assert.equal(initial.newbornDetails?.currentWeightKg, 3.8);

  const corrected = applyVoiceCorrection(initial, 'No, weight is 2.8 kilo, not 3.8.');
  assert.equal(corrected.action, 'UPDATED_FIELD');
  assert.equal(corrected.updatedField, 'currentWeightKg');
  assert.equal(corrected.updatedRecord.newbornDetails?.currentWeightKg, 2.8);
  assert.equal(corrected.updatedRecord.newbornDetails?.feedingObservations, 'Feeding properly');
  assert.equal(corrected.updatedRecord.correctionHistory.length, 1);
  assert.equal(corrected.updatedRecord.correctionHistory[0]?.previousValue, '3.8');
  assert.equal(corrected.updatedRecord.correctionHistory[0]?.correctedValue, '2.8');
});

test('generates pending information follow-up instead of inventing next visit date when missing', () => {
  const record = extractStructuredVisitDeterministic({
    transcript: 'Baby weight 2.8 kilo, baby is feeding properly.',
    visitType: 'NEWBORN',
    language: 'en',
    workerId: 'WORKER001',
    selectedBeneficiary: SYNTHETIC_BENEFICIARIES[2],
  });
  assert.equal(record.nextVisitDate, null);
  const followups = generateFollowUpsFromRecord('visit-1', record);
  assert.ok(followups.some((f) => f.priority === 'PENDING_INFORMATION'));
});

test('extracts Immunisation visit vaccines given and due without inventing missing doses', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Aarav ASHA00128 immunisation visit. OPV-1 and Pentavalent-1 given today. PCV-1 due. Next visit on 18 December.',
    visitType: 'IMMUNISATION',
    language: 'en',
    workerId: 'WORKER001',
  });
  assert.equal(record.beneficiaryId, 'ASHA00128');
  assert.deepEqual(record.immunisationDetails?.vaccinesGiven, ['OPV-1', 'Pentavalent-1']);
  assert.deepEqual(record.immunisationDetails?.vaccinesDue, ['PCV-1']);
  assert.equal(record.nextVisitDate, '2026-12-18');
  assert.equal(record.immunisationDetails?.scheduleVersion, 'NIS-2026.03');
});

test('Scenario 6 noisy/unclear speech recovers safely without inventing weight or next visit date', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Visited Kavya ASHA00129. Background noise unclear weight... ANC checkup done, no bleeding.',
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
  });
  assert.equal(record.beneficiaryId, 'ASHA00129');
  assert.equal(record.pregnancyDetails?.weightKg, null);
  assert.equal(record.nextVisitDate, null);
  assert.equal(record.dangerSignStatus, 'none_detected');
});

test('Scenario 8 barge-in next visit date correction requests clarification when date omitted and updates cleanly when provided', () => {
  const initial = extractStructuredVisitDeterministic({
    transcript: 'Visited ASHA00125 Nandini. Weight is 52 kilo. Next visit on 28 November.',
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
  });

  const promptOutcome = applyVoiceCorrection(initial, 'No, change the next visit date.');
  assert.equal(promptOutcome.action, 'NEEDS_CLARIFICATION');
  assert.equal(promptOutcome.updatedRecord.nextVisitDate, '2026-11-28');

  const updatedOutcome = applyVoiceCorrection(
    initial,
    'No, change the next visit date to 5 December.',
  );
  assert.equal(updatedOutcome.action, 'UPDATED_FIELD');
  assert.equal(updatedOutcome.updatedField, 'nextVisitDate');
  assert.equal(updatedOutcome.updatedRecord.nextVisitDate, '2026-12-05');
  assert.equal(updatedOutcome.updatedRecord.pregnancyDetails?.weightKg, 52);
});

