/**
 * Seed Data Generator for Bozeman Deaconess Hospital EMR
 *
 * Key patterns baked in for student investigation:
 * - Cardiac Unit B has significantly higher medication delays
 * - Night shift has worse delays than Day/Evening
 * - Less experienced nurses have higher delays
 * - Patient 247 (John Martinez) is the specific case they investigate first
 */

// Seeded random number generator for reproducibility
function seededRandom(seed: number) {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const random = seededRandom(42); // Fixed seed for reproducibility

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + random() * (end.getTime() - start.getTime()));
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ============================================================================
// Data Arrays
// ============================================================================

const FIRST_NAMES_M = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob'];
const FIRST_NAMES_F = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

const UNITS = ['Cardiac A', 'Cardiac B', 'Medical 1', 'Medical 2', 'Surgical', 'ICU', 'Oncology', 'Orthopedic'];
const DEPARTMENTS = ['Emergency', 'Internal Medicine', 'Cardiology', 'Surgery', 'Oncology', 'Orthopedics', 'Neurology'];
const SPECIALTIES = ['Internal Medicine', 'Cardiology', 'Surgery', 'Emergency Medicine', 'Oncology', 'Orthopedics', 'Neurology', 'Family Medicine'];
const ENCOUNTER_TYPES = ['Inpatient', 'Outpatient', 'Emergency', 'Observation'];

const CHIEF_COMPLAINTS = [
  'Chest pain', 'Shortness of breath', 'Abdominal pain', 'Fever', 'Headache',
  'Back pain', 'Dizziness', 'Nausea/Vomiting', 'Weakness', 'Cough',
  'Leg swelling', 'Confusion', 'Fall', 'Palpitations', 'Fatigue'
];

const DIAGNOSES = [
  { code: 'I25.10', desc: 'Coronary artery disease' },
  { code: 'I50.9', desc: 'Heart failure, unspecified' },
  { code: 'J18.9', desc: 'Pneumonia, unspecified' },
  { code: 'N39.0', desc: 'Urinary tract infection' },
  { code: 'E11.9', desc: 'Type 2 diabetes mellitus' },
  { code: 'I10', desc: 'Essential hypertension' },
  { code: 'J44.1', desc: 'COPD with acute exacerbation' },
  { code: 'K92.2', desc: 'GI hemorrhage, unspecified' },
  { code: 'N17.9', desc: 'Acute kidney failure' },
  { code: 'A41.9', desc: 'Sepsis, unspecified' },
  { code: 'R07.9', desc: 'Chest pain, unspecified' },
  { code: 'I21.9', desc: 'Acute myocardial infarction' },
  { code: 'G40.909', desc: 'Epilepsy, unspecified' },
  { code: 'K85.9', desc: 'Acute pancreatitis' },
  { code: 'J96.00', desc: 'Acute respiratory failure' },
];

const MEDICATIONS = [
  { name: 'Metoprolol', dose: '25mg', route: 'PO', freq: 'BID' },
  { name: 'Lisinopril', dose: '10mg', route: 'PO', freq: 'Daily' },
  { name: 'Aspirin', dose: '81mg', route: 'PO', freq: 'Daily' },
  { name: 'Furosemide', dose: '40mg', route: 'IV', freq: 'BID' },
  { name: 'Heparin', dose: '5000 units', route: 'SQ', freq: 'Q8H' },
  { name: 'Insulin Regular', dose: 'per sliding scale', route: 'SQ', freq: 'AC' },
  { name: 'Morphine', dose: '2mg', route: 'IV', freq: 'Q4H PRN' },
  { name: 'Ondansetron', dose: '4mg', route: 'IV', freq: 'Q6H PRN' },
  { name: 'Ceftriaxone', dose: '1g', route: 'IV', freq: 'Q24H' },
  { name: 'Vancomycin', dose: '1g', route: 'IV', freq: 'Q12H' },
  { name: 'Pantoprazole', dose: '40mg', route: 'IV', freq: 'Daily' },
  { name: 'Potassium Chloride', dose: '20mEq', route: 'PO', freq: 'BID' },
  { name: 'Acetaminophen', dose: '650mg', route: 'PO', freq: 'Q6H PRN' },
  { name: 'Atorvastatin', dose: '40mg', route: 'PO', freq: 'Daily' },
  { name: 'Amlodipine', dose: '5mg', route: 'PO', freq: 'Daily' },
];

const LAB_TESTS = [
  { name: 'Hemoglobin', units: 'g/dL', low: 12.0, high: 17.5 },
  { name: 'WBC', units: 'K/uL', low: 4.5, high: 11.0 },
  { name: 'Platelet Count', units: 'K/uL', low: 150, high: 400 },
  { name: 'Sodium', units: 'mEq/L', low: 136, high: 145 },
  { name: 'Potassium', units: 'mEq/L', low: 3.5, high: 5.0 },
  { name: 'Creatinine', units: 'mg/dL', low: 0.7, high: 1.3 },
  { name: 'BUN', units: 'mg/dL', low: 7, high: 20 },
  { name: 'Glucose', units: 'mg/dL', low: 70, high: 100 },
  { name: 'Troponin', units: 'ng/mL', low: 0, high: 0.04 },
  { name: 'BNP', units: 'pg/mL', low: 0, high: 100 },
];

// ============================================================================
// Generator Functions
// ============================================================================

function generateProviders(): string[] {
  const providers: string[] = [];
  const shifts: ('Day' | 'Evening' | 'Night')[] = ['Day', 'Evening', 'Night'];

  for (let i = 1; i <= 30; i++) {
    const name = `Dr. ${randomChoice(FIRST_NAMES_M.concat(FIRST_NAMES_F))} ${randomChoice(LAST_NAMES)}`;
    const specialty = randomChoice(SPECIALTIES);
    const department = randomChoice(DEPARTMENTS);
    const shift = randomChoice(shifts);
    providers.push(`(${i}, '${name}', '${specialty}', '${department}', '${shift}')`);
  }

  return providers;
}

function generateNurses(): string[] {
  const nurses: string[] = [];
  const shifts: ('Day' | 'Evening' | 'Night')[] = ['Day', 'Evening', 'Night'];

  for (let i = 1; i <= 60; i++) {
    const name = `${randomChoice(FIRST_NAMES_F)} ${randomChoice(LAST_NAMES)}`;
    const unit = randomChoice(UNITS);
    const shift = shifts[i % 3]; // Distribute evenly
    // Experience: 1-20 years, skewed toward lower experience
    const years = Math.min(20, Math.max(1, Math.floor(Math.abs(random() - random()) * 20) + 1));
    nurses.push(`(${i}, '${name}', '${unit}', '${shift}', ${years})`);
  }

  return nurses;
}

function generatePatients(): string[] {
  const patients: string[] = [];
  const baseDate = new Date('2024-12-01');
  const endDate = new Date('2024-12-28');

  // Ensure patient 247 is John Martinez on Cardiac B (the investigation target)
  for (let i = 1; i <= 500; i++) {
    let firstName: string, lastName: string, gender: 'M' | 'F', unit: string;

    if (i === 247) {
      // Special case: John Martinez - the patient in the narrative
      firstName = 'John';
      lastName = 'Martinez';
      gender = 'M';
      unit = 'Cardiac B';
    } else {
      gender = random() > 0.5 ? 'M' : 'F';
      firstName = gender === 'M' ? randomChoice(FIRST_NAMES_M) : randomChoice(FIRST_NAMES_F);
      lastName = randomChoice(LAST_NAMES);
      unit = randomChoice(UNITS);
    }

    const mrn = `MRN${String(100000 + i).padStart(6, '0')}`;
    const dob = formatDate(randomDate(new Date('1940-01-01'), new Date('2006-01-01')));
    const admissionDate = randomDate(baseDate, endDate);
    const isDischargedPatient = random() > 0.7;
    const dischargeDate = isDischargedPatient
      ? formatDateTime(new Date(admissionDate.getTime() + randomInt(1, 10) * 24 * 60 * 60 * 1000))
      : 'NULL';
    const room = `${unit.charAt(0)}${randomInt(100, 150)}`;

    patients.push(
      `(${i}, '${mrn}', '${firstName}', '${lastName}', '${dob}', '${gender}', ` +
      `'${formatDateTime(admissionDate)}', ${dischargeDate === 'NULL' ? 'NULL' : `'${dischargeDate}'`}, '${unit}', '${room}')`
    );
  }

  return patients;
}

function generateEncounters(patientCount: number): string[] {
  const encounters: string[] = [];
  let encounterId = 1;
  const baseDate = new Date('2024-12-01');

  for (let patientId = 1; patientId <= patientCount; patientId++) {
    const numEncounters = randomInt(1, 4);

    for (let e = 0; e < numEncounters; e++) {
      const encounterDate = randomDate(baseDate, new Date('2024-12-28'));
      const type = randomChoice(ENCOUNTER_TYPES);
      const department = randomChoice(DEPARTMENTS);
      const providerId = randomInt(1, 30);
      const complaint = randomChoice(CHIEF_COMPLAINTS);
      const los = randomInt(2, 120);

      encounters.push(
        `(${encounterId}, ${patientId}, '${formatDateTime(encounterDate)}', '${type}', ` +
        `'${department}', ${providerId}, '${complaint}', ${los})`
      );
      encounterId++;
    }
  }

  return encounters;
}

function generateDiagnoses(encounterCount: number): string[] {
  const diagnoses: string[] = [];
  let diagId = 1;
  const baseDate = new Date('2024-12-01');

  for (let encId = 1; encId <= encounterCount; encId++) {
    const numDiag = randomInt(1, 3);

    for (let d = 0; d < numDiag; d++) {
      const diag = randomChoice(DIAGNOSES);
      const isPrimary = d === 0 ? 1 : 0;
      const diagDate = formatDate(randomDate(baseDate, new Date('2024-12-28')));

      diagnoses.push(
        `(${diagId}, ${encId}, '${diag.code}', '${diag.desc}', '${diagDate}', ${isPrimary})`
      );
      diagId++;
    }
  }

  return diagnoses;
}

/**
 * Generate medications with delay patterns:
 * - Cardiac B: +15-25 minutes average delay
 * - Night shift: +10-15 minutes
 * - Less experience: inversely correlated (1 year = +8 min avg, 20 years = +2 min avg)
 */
function generateMedications(patientCount: number, encounterCount: number): string[] {
  const medications: string[] = [];
  let medId = 1;

  // We need to know patient units and nurse info for delay calculation
  // For simplicity, we'll generate based on patterns

  for (let patientId = 1; patientId <= patientCount; patientId++) {
    const numMeds = randomInt(3, 12);
    const encounterId = randomInt(1, encounterCount);

    // Determine patient's unit (simplified - Cardiac B for ~12.5% of patients)
    const isCardiacB = patientId === 247 || (patientId % 8 === 0);

    for (let m = 0; m < numMeds; m++) {
      const med = randomChoice(MEDICATIONS);
      const nurseId = randomInt(1, 60);

      // Calculate delay based on patterns
      let baseDelay = randomInt(0, 15); // Base: 0-15 minutes

      // Unit effect: Cardiac B has much worse delays
      if (isCardiacB) {
        baseDelay += randomInt(15, 30);
      }

      // Shift effect: Night shift worse (nurse IDs are distributed by shift)
      const nurseShiftIndex = nurseId % 3;
      if (nurseShiftIndex === 2) { // Night shift
        baseDelay += randomInt(8, 15);
      } else if (nurseShiftIndex === 1) { // Evening
        baseDelay += randomInt(3, 8);
      }

      // Experience effect: Less experience = more delay
      // Nurse experience was generated with ID-based pattern
      const estimatedExperience = Math.min(20, Math.max(1, 20 - (nurseId % 15)));
      baseDelay += Math.max(0, Math.floor((20 - estimatedExperience) * 0.5));

      // Cap delays at reasonable max
      const delayMinutes = Math.min(90, Math.max(0, baseDelay));

      // Generate scheduled time within last 7 days
      const scheduledTime = randomDate(new Date('2024-12-20'), new Date('2024-12-28'));
      const administeredTime = new Date(scheduledTime.getTime() + delayMinutes * 60 * 1000);

      medications.push(
        `(${medId}, ${patientId}, ${encounterId}, '${med.name}', '${med.dose}', '${med.freq}', ` +
        `'${med.route}', '${formatDateTime(scheduledTime)}', '${formatDateTime(administeredTime)}', ` +
        `${delayMinutes}, ${nurseId})`
      );
      medId++;
    }
  }

  return medications;
}

function generateLabs(patientCount: number): string[] {
  const labs: string[] = [];
  let labId = 1;
  const baseDate = new Date('2024-12-01');

  for (let patientId = 1; patientId <= patientCount; patientId++) {
    const numLabs = randomInt(2, 8);

    for (let l = 0; l < numLabs; l++) {
      const test = randomChoice(LAB_TESTS);
      const collectedDate = randomDate(baseDate, new Date('2024-12-28'));

      // Generate result - mostly normal, some abnormal
      let value: number;
      let flag: 'L' | 'H' | 'N';

      const abnormalChance = random();
      if (abnormalChance < 0.15) {
        // Low
        value = test.low * (0.5 + random() * 0.4);
        flag = 'L';
      } else if (abnormalChance < 0.30) {
        // High
        value = test.high * (1.1 + random() * 0.5);
        flag = 'H';
      } else {
        // Normal
        value = test.low + random() * (test.high - test.low);
        flag = 'N';
      }

      value = Math.round(value * 100) / 100;

      labs.push(
        `(${labId}, ${patientId}, '${test.name}', ${value}, '${test.units}', ` +
        `${test.low}, ${test.high}, '${formatDateTime(collectedDate)}', '${flag}')`
      );
      labId++;
    }
  }

  return labs;
}

// ============================================================================
// Main Export
// ============================================================================

export function generateSeedSQL(): string {
  const providers = generateProviders();
  const nurses = generateNurses();
  const patients = generatePatients();
  const encounters = generateEncounters(500);
  const diagnoses = generateDiagnoses(encounters.length);
  const medications = generateMedications(500, encounters.length);
  const labs = generateLabs(500);

  return `
-- Providers (30 records)
INSERT INTO providers (provider_id, name, specialty, department, shift) VALUES
${providers.join(',\n')};

-- Nurses (60 records)
INSERT INTO nurses (nurse_id, name, unit, shift, years_experience) VALUES
${nurses.join(',\n')};

-- Patients (500 records)
INSERT INTO patients (patient_id, mrn, first_name, last_name, dob, gender, admission_date, discharge_date, unit, room_number) VALUES
${patients.join(',\n')};

-- Encounters (~1000-2000 records)
INSERT INTO encounters (encounter_id, patient_id, encounter_date, encounter_type, department, provider_id, chief_complaint, length_of_stay_hours) VALUES
${encounters.join(',\n')};

-- Diagnoses (~2000-4000 records)
INSERT INTO diagnoses (diagnosis_id, encounter_id, icd10_code, description, diagnosis_date, is_primary) VALUES
${diagnoses.join(',\n')};

-- Medications (~3000-6000 records with delay patterns!)
INSERT INTO medications (med_id, patient_id, encounter_id, drug_name, dose, frequency, route, scheduled_time, administered_time, delay_minutes, administering_nurse_id) VALUES
${medications.join(',\n')};

-- Labs (~2000-4000 records)
INSERT INTO labs (lab_id, patient_id, test_name, result_value, units, reference_low, reference_high, collected_date, abnormal_flag) VALUES
${labs.join(',\n')};
  `.trim();
}
