// ============================================================================
// EMR Database Types
// ============================================================================

export interface Patient {
  patient_id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: 'M' | 'F';
  admission_date: string;
  discharge_date: string | null;
  unit: string;
  room_number: string;
}

export interface Encounter {
  encounter_id: number;
  patient_id: number;
  encounter_date: string;
  encounter_type: string;
  department: string;
  provider_id: number;
  chief_complaint: string;
  length_of_stay_hours: number;
}

export interface Diagnosis {
  diagnosis_id: number;
  encounter_id: number;
  icd10_code: string;
  description: string;
  diagnosis_date: string;
  is_primary: boolean;
}

export interface Medication {
  med_id: number;
  patient_id: number;
  encounter_id: number;
  drug_name: string;
  dose: string;
  frequency: string;
  route: string;
  scheduled_time: string;
  administered_time: string;
  delay_minutes: number;
  administering_nurse_id: number;
}

export interface Lab {
  lab_id: number;
  patient_id: number;
  test_name: string;
  result_value: number;
  units: string;
  reference_low: number;
  reference_high: number;
  collected_date: string;
  abnormal_flag: 'L' | 'H' | 'N';
}

export interface Provider {
  provider_id: number;
  name: string;
  specialty: string;
  department: string;
  shift: 'Day' | 'Evening' | 'Night';
}

export interface Nurse {
  nurse_id: number;
  name: string;
  unit: string;
  shift: 'Day' | 'Evening' | 'Night';
  years_experience: number;
}

// ============================================================================
// Task/Study Types (CMS-ready structure)
// ============================================================================

export interface Task {
  id: string;              // e.g., "1.1", "2.3"
  round: number;
  queryNum: number;
  prompt: string;          // The question students need to answer
  expectedQuery: string;   // Reference query for generating expected results
  preserveOrder: boolean;  // Whether ORDER BY matters for comparison
  hints?: string[];
}

export interface Round {
  id: number;
  title: string;           // e.g., "The Patient"
  subtitle: string;        // SQL concept being taught
  contextBefore: string;   // Narrative before round starts
  contextAfter?: string;   // Narrative after round completes (shown between rounds)
}

export interface TableSchema {
  name: string;
  description: string;
  columns: Array<{
    name: string;
    type: string;
    description?: string;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    references?: string;
  }>;
}

// ============================================================================
// Study Session Types
// ============================================================================

export interface StudentInfo {
  studentId: string;
  sqlExpertise: 0 | 1 | 2 | 3;
}

export interface TaskAttempt {
  studentId: string;
  sqlExpertise: number;
  round: number;
  queryNum: number;
  taskId: string;
  querySequence: number;
  attemptNum: number;
  timeSec: number;
  totalAttempts: number;
  submittedQuery: string;
  completedAt: string;
  isCorrect: boolean;
}

export interface StudySession {
  studentInfo: StudentInfo | null;
  currentRound: number;
  currentQuery: number;
  attempts: TaskAttempt[];
  taskStartTime: number | null;
  isComplete: boolean;
}

// ============================================================================
// Query Result Types
// ============================================================================

export interface QueryResult {
  columns: string[];
  values: unknown[][];
  error?: string;
}

export interface ComparisonResult {
  isMatch: boolean;
  studentResult: QueryResult;
  expectedResult: QueryResult;
  message?: string;
}
