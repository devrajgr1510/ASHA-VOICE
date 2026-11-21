import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GUIDELINE_VERSIONS } from '../../src/shared/dangerSigns';
import { SYNTHETIC_BENEFICIARIES } from '../../src/shared/clinicalEngine';

const CUSTOM_DB_PATH = process.env.ASHA_DB_PATH
  ? path.resolve(process.env.ASHA_DB_PATH)
  : null;
const DATA_DIR = CUSTOM_DB_PATH ? path.dirname(CUSTOM_DB_PATH) : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = CUSTOM_DB_PATH ?? path.join(DATA_DIR, 'asha_register.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPasscode(passcode: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ASHA_WORKER', 'SUPERVISOR', 'ADMIN')),
      preferred_language TEXT NOT NULL DEFAULT 'en',
      account_status TEXT NOT NULL DEFAULT 'ACTIVE',
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      worker_code TEXT UNIQUE NOT NULL,
      assigned_area TEXT NOT NULL,
      supervisor_id TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      household_code TEXT UNIQUE NOT NULL,
      locality TEXT NOT NULL,
      synthetic_address TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY,
      beneficiary_code TEXT UNIQUE NOT NULL,
      household_id TEXT NOT NULL REFERENCES households(id),
      display_name TEXT NOT NULL,
      beneficiary_type TEXT NOT NULL CHECK(beneficiary_type IN ('PREGNANT_WOMAN', 'NEWBORN', 'CHILD')),
      date_of_birth TEXT,
      mother_beneficiary_code TEXT,
      synthetic_data_flag INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS voice_sessions (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES workers(id),
      language TEXT NOT NULL,
      provider TEXT NOT NULL,
      session_status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      time_to_first_audio_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      voice_session_id TEXT REFERENCES voice_sessions(id),
      raw_transcript TEXT NOT NULL,
      language TEXT NOT NULL,
      processing_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      client_request_id TEXT UNIQUE NOT NULL,
      beneficiary_id TEXT NOT NULL REFERENCES beneficiaries(id),
      worker_id TEXT NOT NULL REFERENCES workers(id),
      visit_type TEXT NOT NULL CHECK(visit_type IN ('ANC', 'NEWBORN', 'IMMUNISATION')),
      visit_date TEXT NOT NULL,
      language TEXT NOT NULL,
      transcript_id TEXT REFERENCES transcripts(id),
      record_status TEXT NOT NULL,
      confirmation_status TEXT NOT NULL,
      danger_sign_status TEXT NOT NULL,
      referral_status TEXT NOT NULL,
      next_visit_date TEXT,
      structured_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pregnancy_records (
      id TEXT PRIMARY KEY,
      visit_id TEXT UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      gestational_age_weeks INTEGER,
      weight_kg REAL,
      blood_pressure TEXT,
      anc_status TEXT,
      ifa_status TEXT,
      td_status TEXT,
      reported_observations TEXT
    );

    CREATE TABLE IF NOT EXISTS newborn_records (
      id TEXT PRIMARY KEY,
      visit_id TEXT UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      birth_date TEXT,
      age_days INTEGER,
      birth_weight_kg REAL,
      current_weight_kg REAL,
      reported_temperature TEXT,
      feeding_observations TEXT
    );

    CREATE TABLE IF NOT EXISTS immunisation_records (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      vaccine_code TEXT NOT NULL,
      vaccination_status TEXT NOT NULL,
      vaccination_date TEXT,
      next_due_date TEXT,
      schedule_version TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guideline_versions (
      id TEXT PRIMARY KEY,
      guideline_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      page_or_section TEXT NOT NULL,
      version TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      reviewed_by TEXT NOT NULL,
      reviewed_at TEXT NOT NULL,
      active_status INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS danger_sign_events (
      id TEXT PRIMARY KEY,
      visit_id TEXT REFERENCES visits(id) ON DELETE CASCADE,
      beneficiary_code TEXT,
      worker_id TEXT NOT NULL REFERENCES workers(id),
      danger_sign_code TEXT NOT NULL,
      danger_sign_title TEXT NOT NULL,
      source_guideline_id TEXT NOT NULL REFERENCES guideline_versions(id),
      matched_phrase TEXT NOT NULL,
      detection_method TEXT NOT NULL,
      confidence REAL NOT NULL,
      confirmation_status TEXT NOT NULL,
      severity_category TEXT NOT NULL,
      detected_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      visit_id TEXT REFERENCES visits(id) ON DELETE CASCADE,
      danger_event_id TEXT NOT NULL REFERENCES danger_sign_events(id),
      beneficiary_code TEXT,
      beneficiary_name TEXT,
      worker_id TEXT NOT NULL REFERENCES workers(id),
      referral_destination_type TEXT NOT NULL DEFAULT 'PHC',
      referral_status TEXT NOT NULL,
      referral_timestamp TEXT NOT NULL,
      acknowledgement_status TEXT NOT NULL DEFAULT 'PENDING'
    );

    CREATE TABLE IF NOT EXISTS followups (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      beneficiary_id TEXT NOT NULL REFERENCES beneficiaries(id),
      worker_id TEXT NOT NULL REFERENCES workers(id),
      task_description TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_date TEXT,
      task_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS corrections (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      previous_value TEXT,
      corrected_value TEXT,
      correction_source TEXT NOT NULL,
      corrected_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      correlation_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS retention_config (
      id TEXT PRIMARY KEY,
      audio_retention_hours INTEGER NOT NULL DEFAULT 0,
      transcript_retention_days INTEGER NOT NULL DEFAULT 30,
      external_provider_disclosure TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      voice_speed REAL NOT NULL DEFAULT 1.0,
      high_contrast INTEGER NOT NULL DEFAULT 0,
      large_text INTEGER NOT NULL DEFAULT 0,
      offline_auto_sync INTEGER NOT NULL DEFAULT 1,
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_read_states (
      alert_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_read INTEGER NOT NULL DEFAULT 1,
      read_at TEXT NOT NULL,
      PRIMARY KEY (alert_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_visits_worker ON visits(worker_id, visit_date DESC);
    CREATE INDEX IF NOT EXISTS idx_visits_ben ON visits(beneficiary_id);
    CREATE INDEX IF NOT EXISTS idx_followups_worker ON followups(worker_id, task_status);
    CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(referral_status, referral_timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);
  `);

  // Safe additive migration for followups.remarks on existing databases
  const fuCols = db.prepare(`PRAGMA table_info(followups)`).all() as Array<{ name: string }>;
  if (!fuCols.some((c) => c.name === 'remarks')) {
    db.exec(`ALTER TABLE followups ADD COLUMN remarks TEXT`);
  }

  const now = new Date().toISOString();
  const defaultAudioHours = Math.max(0, Number(process.env.AUDIO_RETENTION_HOURS ?? 0) || 0);
  const defaultTranscriptDays = Math.max(1, Number(process.env.TRANSCRIPT_RETENTION_DAYS ?? 30) || 30);

  db.prepare(`
    INSERT OR IGNORE INTO retention_config (id, audio_retention_hours, transcript_retention_days, external_provider_disclosure, updated_by, updated_at)
    VALUES ('default', ?, ?, ?, 'System Default', ?)
  `).run(
    defaultAudioHours,
    defaultTranscriptDays,
    'Audio is streamed only to the server-side speech gateway for visit transcription and read-back; raw audio is not persisted by default (0h retention).',
    now,
  );

  seedInitialData();
}

function seedInitialData(): void {
  const existingUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (existingUsers.cnt > 0) return;

  const now = new Date().toISOString();
  const demoPassHash = hashPasscode('asha-demo-2026');

  const insertUser = db.prepare(`
    INSERT INTO users (id, full_name, username, password_hash, role, preferred_language, account_status, avatar_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  insertUser.run(
    'user-sup-01',
    'Dr. Kavitha Rao',
    'supervisor01',
    demoPassHash,
    'SUPERVISOR',
    'en',
    '/src/assets/images/supervisor_doctor_portrait_1795246324320.jpg',
    now,
  );
  insertUser.run(
    'user-asha-01',
    'Savitha Gowda',
    'worker01',
    demoPassHash,
    'ASHA_WORKER',
    'kn',
    '/src/assets/images/asha_worker_portrait_1795246317288.jpg',
    now,
  );
  insertUser.run(
    'user-admin-01',
    'District Health Admin',
    'admin01',
    demoPassHash,
    'ADMIN',
    'en',
    '/src/assets/images/supervisor_doctor_portrait_1795246324320.jpg',
    now,
  );

  db.prepare(`
    INSERT INTO workers (id, user_id, worker_code, assigned_area, supervisor_id)
    VALUES (?, ?, ?, ?, ?)
  `).run('WORKER001', 'user-asha-01', 'ASHA-DEV-04', 'Devanahalli Block · Wards 4-6', 'user-sup-01');

  db.prepare(`
    INSERT INTO workers (id, user_id, worker_code, assigned_area, supervisor_id)
    VALUES (?, ?, ?, ?, ?)
  `).run('SUPERVISOR001', 'user-sup-01', 'SUP-DEV-01', 'Devanahalli PHC Cluster', 'user-sup-01');

  const insertHousehold = db.prepare(`
    INSERT OR IGNORE INTO households (id, household_code, locality, synthetic_address, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertBeneficiary = db.prepare(`
    INSERT OR IGNORE INTO beneficiaries (id, beneficiary_code, household_id, display_name, beneficiary_type, date_of_birth, mother_beneficiary_code, synthetic_data_flag, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  for (const ben of SYNTHETIC_BENEFICIARIES) {
    insertHousehold.run(ben.householdId, ben.householdCode, ben.locality, ben.syntheticAddress, now);
    insertBeneficiary.run(
      ben.id,
      ben.beneficiaryCode,
      ben.householdId,
      ben.displayName,
      ben.beneficiaryType,
      ben.dateOfBirth,
      ben.motherBeneficiaryCode ?? null,
      now,
    );
  }

  const insertGuideline = db.prepare(`
    INSERT OR IGNORE INTO guideline_versions (id, guideline_name, source_url, page_or_section, version, effective_date, reviewed_by, reviewed_at, active_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of GUIDELINE_VERSIONS) {
    insertGuideline.run(
      g.id,
      g.guidelineName,
      g.sourceUrl,
      g.pageOrSection,
      g.version,
      g.effectiveDate,
      g.reviewedBy,
      g.reviewedAt,
      g.activeStatus ? 1 : 0,
    );
  }

  // Seed one synthetic completed ANC visit for Lakshmi (ASHA00126) so history is populated realistically
  const sampleVisitId = 'visit-seed-001';
  const sampleTranscriptId = 'tr-seed-001';
  const sampleSessionId = 'vs-seed-001';
  const sampleTranscript =
    'Today visited ASHA00126 Lakshmi. ANC checkup completed. Weight 55 kg. IFA tablets taking regularly. Next visit on 30 November.';

  db.prepare(`
    INSERT INTO voice_sessions (id, worker_id, language, provider, session_status, started_at, ended_at, time_to_first_audio_ms)
    VALUES (?, 'WORKER001', 'kn', 'gemini-3.5-transcribe-live', 'COMPLETED', ?, ?, 940)
  `).run(sampleSessionId, now, now);

  db.prepare(`
    INSERT INTO transcripts (id, voice_session_id, raw_transcript, language, processing_status, created_at)
    VALUES (?, ?, ?, 'kn', 'EXTRACTED', ?)
  `).run(sampleTranscriptId, sampleSessionId, sampleTranscript, now);

  const sampleStructured = {
    clientRequestId: 'seed-req-001',
    beneficiaryId: 'ASHA00126',
    beneficiaryName: 'Lakshmi',
    householdId: 'HH-102',
    workerId: 'WORKER001',
    visitType: 'ANC',
    visitDate: '2026-11-20',
    language: 'kn',
    detectedLanguages: ['Kannada', 'English'],
    observations: sampleTranscript,
    pregnancyDetails: {
      gestationalAgeWeeks: 28,
      ancStatus: 'completed',
      weightKg: 55,
      bloodPressure: '116/76',
      ifaStatus: 'reported_taking',
      vaccinationStatus: 'reported_completed',
      tdDose: 'Td-2',
      reportedSymptoms: null,
    },
    newbornDetails: null,
    immunisationDetails: null,
    nextVisitDate: '2026-11-30',
    dangerSignStatus: 'none_detected',
    dangerAnalysis: {
      status: 'none_detected',
      matches: [],
      negatedMatches: [],
      uncertainMatches: [],
      analyzedAt: now,
    },
    referralStatus: 'not_required',
    confirmationStatus: 'confirmed',
    sourceTranscript: sampleTranscript,
    extractionSource: 'GEMINI_STRUCTURED_AI',
    fieldConfidence: { beneficiaryId: 0.99, weightKg: 0.96, nextVisitDate: 0.95 },
    originalUtterances: { fullTranscript: sampleTranscript },
    correctionHistory: [],
  };

  db.prepare(`
    INSERT INTO visits (id, client_request_id, beneficiary_id, worker_id, visit_type, visit_date, language, transcript_id, record_status, confirmation_status, danger_sign_status, referral_status, next_visit_date, structured_json, created_at, updated_at)
    VALUES (?, 'seed-req-001', 'ben-002', 'WORKER001', 'ANC', '2026-11-20', 'kn', ?, 'SAVED', 'confirmed', 'none_detected', 'not_required', '2026-11-30', ?, ?, ?)
  `).run(sampleVisitId, sampleTranscriptId, JSON.stringify(sampleStructured), now, now);

  db.prepare(`
    INSERT INTO pregnancy_records (id, visit_id, gestational_age_weeks, weight_kg, blood_pressure, anc_status, ifa_status, td_status, reported_observations)
    VALUES ('preg-seed-001', ?, 28, 55, '116/76', 'completed', 'reported_taking', 'reported_completed', ?)
  `).run(sampleVisitId, sampleTranscript);

  db.prepare(`
    INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
    VALUES ('fu-seed-001', ?, 'ben-002', 'WORKER001', 'Scheduled ANC follow-up visit with Lakshmi (ASHA00126)', 'SCHEDULED_VISIT', '2026-11-30', 'PENDING', ?)
  `).run(sampleVisitId, now);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, timestamp, correlation_id)
    VALUES ('audit-seed-001', 'user-asha-01', 'VISIT', ?, 'SEED_SYNTHETIC_RECORD', ?, 'corr-seed-001')
  `).run(sampleVisitId, now);

  // Additional realistic synthetic visits (Newborn + Immunisation) dated relative to today for charts & register
  const dayIso = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const nbVisitDate = dayIso(-2);
  const nbTranscript =
    'Baby of Rekha ASHA00127 newborn checkup. Baby weight 2.9 kilo, feeding properly, vaccination record checked.';
  const nbStructured = {
    clientRequestId: 'seed-req-002',
    beneficiaryId: 'ASHA00127',
    beneficiaryName: 'Baby of Rekha',
    householdId: 'HH-103',
    workerId: 'WORKER001',
    visitType: 'NEWBORN',
    visitDate: nbVisitDate,
    language: 'en',
    detectedLanguages: ['English'],
    observations: nbTranscript,
    pregnancyDetails: null,
    newbornDetails: {
      newbornId: 'ASHA00127',
      motherBeneficiaryId: 'ASHA00120',
      birthDate: '2026-11-12',
      ageDays: 9,
      birthWeightKg: 2.8,
      currentWeightKg: 2.9,
      feedingObservations: 'Feeding properly',
      reportedTemperature: '98.2 F',
      immunisationChecked: true,
    },
    immunisationDetails: null,
    nextVisitDate: dayIso(5),
    dangerSignStatus: 'none_detected',
    dangerAnalysis: { status: 'none_detected', matches: [], negatedMatches: [], uncertainMatches: [], analyzedAt: now },
    referralStatus: 'not_required',
    confirmationStatus: 'confirmed',
    sourceTranscript: nbTranscript,
    extractionSource: 'GEMINI_STRUCTURED_AI',
    fieldConfidence: { beneficiaryId: 0.99, currentWeightKg: 0.95, feedingObservations: 0.94 },
    originalUtterances: { fullTranscript: nbTranscript },
    correctionHistory: [],
  };
  db.prepare(`
    INSERT INTO transcripts (id, voice_session_id, raw_transcript, language, processing_status, created_at)
    VALUES ('tr-seed-002', ?, ?, 'en', 'CONFIRMED', ?)
  `).run(sampleSessionId, nbTranscript, now);
  db.prepare(`
    INSERT INTO visits (id, client_request_id, beneficiary_id, worker_id, visit_type, visit_date, language, transcript_id, record_status, confirmation_status, danger_sign_status, referral_status, next_visit_date, structured_json, created_at, updated_at)
    VALUES ('visit-seed-002', 'seed-req-002', 'ben-003', 'WORKER001', 'NEWBORN', ?, 'en', 'tr-seed-002', 'SAVED', 'confirmed', 'none_detected', 'not_required', ?, ?, ?, ?)
  `).run(nbVisitDate, dayIso(5), JSON.stringify(nbStructured), now, now);
  db.prepare(`
    INSERT INTO newborn_records (id, visit_id, birth_date, age_days, birth_weight_kg, current_weight_kg, reported_temperature, feeding_observations)
    VALUES ('nb-seed-002', 'visit-seed-002', '2026-11-12', 9, 2.8, 2.9, '98.2 F', 'Feeding properly')
  `).run();
  db.prepare(`
    INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
    VALUES ('fu-seed-002', 'visit-seed-002', 'ben-003', 'WORKER001', 'HBNC Day-14 weight progression & feeding check for Baby of Rekha (ASHA00127)', 'ROUTINE_FOLLOWUP', ?, 'PENDING', ?)
  `).run(dayIso(5), now);

  const immVisitDate = dayIso(-1);
  const immTranscript =
    'Aarav ASHA00128 immunisation visit. OPV-1 and Pentavalent-1 given today. PCV-1 due. Next visit on 18 December.';
  const immStructured = {
    clientRequestId: 'seed-req-003',
    beneficiaryId: 'ASHA00128',
    beneficiaryName: 'Aarav',
    householdId: 'HH-104',
    workerId: 'WORKER001',
    visitType: 'IMMUNISATION',
    visitDate: immVisitDate,
    language: 'en',
    detectedLanguages: ['English'],
    observations: immTranscript,
    pregnancyDetails: null,
    newbornDetails: null,
    immunisationDetails: {
      childAgeLabel: '6 Weeks',
      vaccinesGiven: ['OPV-1', 'Pentavalent-1'],
      vaccinesDue: ['PCV-1'],
      missedVaccines: [],
      previousVaccineHistory: 'BCG, OPV-0',
      scheduleVersion: 'NIS-2026.03',
    },
    nextVisitDate: dayIso(12),
    dangerSignStatus: 'none_detected',
    dangerAnalysis: { status: 'none_detected', matches: [], negatedMatches: [], uncertainMatches: [], analyzedAt: now },
    referralStatus: 'not_required',
    confirmationStatus: 'confirmed',
    sourceTranscript: immTranscript,
    extractionSource: 'GEMINI_STRUCTURED_AI',
    fieldConfidence: { beneficiaryId: 0.99, vaccinesGiven: 0.96, vaccinesDue: 0.94 },
    originalUtterances: { fullTranscript: immTranscript },
    correctionHistory: [],
  };
  db.prepare(`
    INSERT INTO transcripts (id, voice_session_id, raw_transcript, language, processing_status, created_at)
    VALUES ('tr-seed-003', ?, ?, 'en', 'CONFIRMED', ?)
  `).run(sampleSessionId, immTranscript, now);
  db.prepare(`
    INSERT INTO visits (id, client_request_id, beneficiary_id, worker_id, visit_type, visit_date, language, transcript_id, record_status, confirmation_status, danger_sign_status, referral_status, next_visit_date, structured_json, created_at, updated_at)
    VALUES ('visit-seed-003', 'seed-req-003', 'ben-004', 'WORKER001', 'IMMUNISATION', ?, 'en', 'tr-seed-003', 'SAVED', 'confirmed', 'none_detected', 'not_required', ?, ?, ?, ?)
  `).run(immVisitDate, dayIso(12), JSON.stringify(immStructured), now, now);
  db.prepare(`
    INSERT INTO immunisation_records (id, visit_id, vaccine_code, vaccination_status, vaccination_date, next_due_date, schedule_version)
    VALUES ('imm-seed-003a', 'visit-seed-003', 'OPV-1', 'GIVEN', ?, ?, 'NIS-2026.03'),
           ('imm-seed-003b', 'visit-seed-003', 'Pentavalent-1', 'GIVEN', ?, ?, 'NIS-2026.03'),
           ('imm-seed-003c', 'visit-seed-003', 'PCV-1', 'DUE', NULL, ?, 'NIS-2026.03')
  `).run(immVisitDate, dayIso(12), immVisitDate, dayIso(12), dayIso(12));
  db.prepare(`
    INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
    VALUES ('fu-seed-003', 'visit-seed-003', 'ben-004', 'WORKER001', 'Administer due PCV-1 vaccine for Aarav (ASHA00128)', 'SCHEDULED_VISIT', ?, 'PENDING', ?)
  `).run(dayIso(12), now);

  // Default accessibility & voice settings
  db.prepare(`
    INSERT OR IGNORE INTO user_settings (user_id, preferred_language, voice_speed, high_contrast, large_text, offline_auto_sync, notifications_enabled, updated_at)
    VALUES ('user-asha-01', 'kn', 1.0, 0, 0, 1, 1, ?),
           ('user-sup-01', 'en', 1.0, 0, 0, 1, 1, ?),
           ('user-admin-01', 'en', 1.0, 0, 0, 1, 1, ?)
  `).run(now, now, now);
}
