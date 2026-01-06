import type { TableSchema } from '@/types';

// ============================================================================
// Table Schema Definitions (for student reference sidebar)
// ============================================================================

export const tableSchemas: TableSchema[] = [
  {
    name: 'patients',
    description: 'Patient demographics and current location',
    columns: [
      { name: 'patient_id', type: 'INTEGER', description: 'Unique patient identifier', isPrimaryKey: true },
      { name: 'mrn', type: 'TEXT', description: 'Medical record number' },
      { name: 'first_name', type: 'TEXT', description: 'Patient first name' },
      { name: 'last_name', type: 'TEXT', description: 'Patient last name' },
      { name: 'dob', type: 'DATE', description: 'Date of birth' },
      { name: 'gender', type: 'TEXT', description: 'M or F' },
      { name: 'admission_date', type: 'DATETIME', description: 'When admitted' },
      { name: 'discharge_date', type: 'DATETIME', description: 'When discharged (NULL if still admitted)' },
      { name: 'unit', type: 'TEXT', description: 'Hospital unit (e.g., "Cardiac B")' },
      { name: 'room_number', type: 'TEXT', description: 'Room assignment' },
    ],
  },
  {
    name: 'encounters',
    description: 'Patient visits and encounters',
    columns: [
      { name: 'encounter_id', type: 'INTEGER', description: 'Unique encounter identifier', isPrimaryKey: true },
      { name: 'patient_id', type: 'INTEGER', isForeignKey: true, references: 'patients.patient_id' },
      { name: 'encounter_date', type: 'DATETIME', description: 'When encounter occurred' },
      { name: 'encounter_type', type: 'TEXT', description: 'Type of visit' },
      { name: 'department', type: 'TEXT', description: 'Department' },
      { name: 'provider_id', type: 'INTEGER', isForeignKey: true, references: 'providers.provider_id' },
      { name: 'chief_complaint', type: 'TEXT', description: 'Reason for visit' },
      { name: 'length_of_stay_hours', type: 'INTEGER', description: 'Duration in hours' },
    ],
  },
  {
    name: 'diagnoses',
    description: 'Patient diagnoses linked to encounters',
    columns: [
      { name: 'diagnosis_id', type: 'INTEGER', description: 'Unique diagnosis identifier', isPrimaryKey: true },
      { name: 'encounter_id', type: 'INTEGER', isForeignKey: true, references: 'encounters.encounter_id' },
      { name: 'icd10_code', type: 'TEXT', description: 'ICD-10 diagnosis code' },
      { name: 'description', type: 'TEXT', description: 'Diagnosis description' },
      { name: 'diagnosis_date', type: 'DATE', description: 'When diagnosed' },
      { name: 'is_primary', type: 'BOOLEAN', description: '1 if primary diagnosis' },
    ],
  },
  {
    name: 'medications',
    description: 'Medication administration records',
    columns: [
      { name: 'med_id', type: 'INTEGER', description: 'Unique medication record ID', isPrimaryKey: true },
      { name: 'patient_id', type: 'INTEGER', isForeignKey: true, references: 'patients.patient_id' },
      { name: 'encounter_id', type: 'INTEGER', isForeignKey: true, references: 'encounters.encounter_id' },
      { name: 'drug_name', type: 'TEXT', description: 'Medication name' },
      { name: 'dose', type: 'TEXT', description: 'Dose amount' },
      { name: 'frequency', type: 'TEXT', description: 'How often (e.g., "Q6H")' },
      { name: 'route', type: 'TEXT', description: 'Route of administration (PO, IV, etc.)' },
      { name: 'scheduled_time', type: 'DATETIME', description: 'When medication was due' },
      { name: 'administered_time', type: 'DATETIME', description: 'When actually given' },
      { name: 'delay_minutes', type: 'INTEGER', description: 'Minutes late (key metric!)' },
      { name: 'administering_nurse_id', type: 'INTEGER', isForeignKey: true, references: 'nurses.nurse_id' },
    ],
  },
  {
    name: 'labs',
    description: 'Laboratory test results',
    columns: [
      { name: 'lab_id', type: 'INTEGER', description: 'Unique lab result ID', isPrimaryKey: true },
      { name: 'patient_id', type: 'INTEGER', isForeignKey: true, references: 'patients.patient_id' },
      { name: 'test_name', type: 'TEXT', description: 'Name of lab test' },
      { name: 'result_value', type: 'REAL', description: 'Numeric result' },
      { name: 'units', type: 'TEXT', description: 'Unit of measure' },
      { name: 'reference_low', type: 'REAL', description: 'Lower reference bound' },
      { name: 'reference_high', type: 'REAL', description: 'Upper reference bound' },
      { name: 'collected_date', type: 'DATETIME', description: 'When sample collected' },
      { name: 'abnormal_flag', type: 'TEXT', description: 'L=Low, H=High, N=Normal' },
    ],
  },
  {
    name: 'providers',
    description: 'Physicians and other providers',
    columns: [
      { name: 'provider_id', type: 'INTEGER', description: 'Unique provider ID', isPrimaryKey: true },
      { name: 'name', type: 'TEXT', description: 'Provider full name' },
      { name: 'specialty', type: 'TEXT', description: 'Medical specialty' },
      { name: 'department', type: 'TEXT', description: 'Department' },
      { name: 'shift', type: 'TEXT', description: 'Primary shift (Day/Evening/Night)' },
    ],
  },
  {
    name: 'nurses',
    description: 'Nursing staff',
    columns: [
      { name: 'nurse_id', type: 'INTEGER', description: 'Unique nurse ID', isPrimaryKey: true },
      { name: 'name', type: 'TEXT', description: 'Nurse full name' },
      { name: 'unit', type: 'TEXT', description: 'Assigned unit' },
      { name: 'shift', type: 'TEXT', description: 'Work shift (Day/Evening/Night)' },
      { name: 'years_experience', type: 'INTEGER', description: 'Years of nursing experience' },
    ],
  },
];

// ============================================================================
// SQL Schema Creation
// ============================================================================

export const SCHEMA_SQL = `
-- Patients table
CREATE TABLE patients (
  patient_id INTEGER PRIMARY KEY,
  mrn TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT CHECK(gender IN ('M', 'F')),
  admission_date DATETIME NOT NULL,
  discharge_date DATETIME,
  unit TEXT NOT NULL,
  room_number TEXT NOT NULL
);

-- Providers table
CREATE TABLE providers (
  provider_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  department TEXT NOT NULL,
  shift TEXT CHECK(shift IN ('Day', 'Evening', 'Night'))
);

-- Nurses table
CREATE TABLE nurses (
  nurse_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  shift TEXT CHECK(shift IN ('Day', 'Evening', 'Night')),
  years_experience INTEGER NOT NULL
);

-- Encounters table
CREATE TABLE encounters (
  encounter_id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  encounter_date DATETIME NOT NULL,
  encounter_type TEXT NOT NULL,
  department TEXT NOT NULL,
  provider_id INTEGER NOT NULL,
  chief_complaint TEXT,
  length_of_stay_hours INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (provider_id) REFERENCES providers(provider_id)
);

-- Diagnoses table
CREATE TABLE diagnoses (
  diagnosis_id INTEGER PRIMARY KEY,
  encounter_id INTEGER NOT NULL,
  icd10_code TEXT NOT NULL,
  description TEXT NOT NULL,
  diagnosis_date DATE NOT NULL,
  is_primary INTEGER DEFAULT 0,
  FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id)
);

-- Medications table (key table for investigation!)
CREATE TABLE medications (
  med_id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  encounter_id INTEGER NOT NULL,
  drug_name TEXT NOT NULL,
  dose TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT NOT NULL,
  scheduled_time DATETIME NOT NULL,
  administered_time DATETIME NOT NULL,
  delay_minutes INTEGER NOT NULL,
  administering_nurse_id INTEGER NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id),
  FOREIGN KEY (administering_nurse_id) REFERENCES nurses(nurse_id)
);

-- Labs table
CREATE TABLE labs (
  lab_id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  result_value REAL NOT NULL,
  units TEXT NOT NULL,
  reference_low REAL NOT NULL,
  reference_high REAL NOT NULL,
  collected_date DATETIME NOT NULL,
  abnormal_flag TEXT CHECK(abnormal_flag IN ('L', 'H', 'N')),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Create indexes for common queries
CREATE INDEX idx_patients_unit ON patients(unit);
CREATE INDEX idx_patients_last_name ON patients(last_name);
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_medications_delay ON medications(delay_minutes);
CREATE INDEX idx_encounters_patient ON encounters(patient_id);
CREATE INDEX idx_diagnoses_encounter ON diagnoses(encounter_id);
CREATE INDEX idx_labs_patient ON labs(patient_id);
`;
