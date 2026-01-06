import type { Task } from '@/types';

/**
 * All 18 SQL tasks with prompts and expected queries.
 * Structured for future CMS integration (Strapi).
 *
 * Note: expectedQuery is a reference implementation. Student queries
 * are validated by comparing result sets, not SQL syntax.
 */
export const tasks: Task[] = [
  // ============================================================================
  // ROUND 1: The Patient (Basic SELECT/WHERE)
  // ============================================================================
  {
    id: '1.1',
    round: 1,
    queryNum: 1,
    prompt: 'Find all patients with last name "Martinez".',
    expectedQuery: `SELECT * FROM patients WHERE last_name = 'Martinez';`,
    preserveOrder: false,
    hints: ['Use the WHERE clause to filter by last_name', 'String values need single quotes'],
  },
  {
    id: '1.2',
    round: 1,
    queryNum: 2,
    prompt: 'Find all patients currently admitted to Cardiac Unit B (not yet discharged).',
    expectedQuery: `SELECT * FROM patients WHERE unit = 'Cardiac B' AND discharge_date IS NULL;`,
    preserveOrder: false,
    hints: ['NULL values need IS NULL, not = NULL', 'Combine conditions with AND'],
  },
  {
    id: '1.3',
    round: 1,
    queryNum: 3,
    prompt: 'List all medications administered to patient_id 247 in the last 7 days, ordered by scheduled time.',
    expectedQuery: `SELECT * FROM medications WHERE patient_id = 247 AND scheduled_time >= date('now', '-7 days') ORDER BY scheduled_time;`,
    preserveOrder: true,
    hints: ['Use ORDER BY for sorting', 'SQLite date functions: date("now", "-7 days")'],
  },

  // ============================================================================
  // ROUND 2: The History (Single JOINs)
  // ============================================================================
  {
    id: '2.1',
    round: 2,
    queryNum: 1,
    prompt: 'List all of patient 247\'s encounters with the provider name included.',
    expectedQuery: `SELECT e.*, p.name as provider_name
FROM encounters e
JOIN providers p ON e.provider_id = p.provider_id
WHERE e.patient_id = 247;`,
    preserveOrder: false,
    hints: ['JOIN connects tables using a shared key', 'Use table aliases (e, p) for cleaner queries'],
  },
  {
    id: '2.2',
    round: 2,
    queryNum: 2,
    prompt: 'Show all medications for patient 247 with the administering nurse\'s name.',
    expectedQuery: `SELECT m.*, n.name as nurse_name
FROM medications m
JOIN nurses n ON m.administering_nurse_id = n.nurse_id
WHERE m.patient_id = 247;`,
    preserveOrder: false,
    hints: ['The foreign key is administering_nurse_id', 'Alias the joined column for clarity'],
  },
  {
    id: '2.3',
    round: 2,
    queryNum: 3,
    prompt: 'Find all diagnoses for patient 247 with their encounter dates.',
    expectedQuery: `SELECT d.*, e.encounter_date
FROM diagnoses d
JOIN encounters e ON d.encounter_id = e.encounter_id
WHERE e.patient_id = 247;`,
    preserveOrder: false,
    hints: ['Diagnoses link to patients through encounters', 'You need to JOIN through the encounters table'],
  },

  // ============================================================================
  // ROUND 3: The Pattern (Aggregations)
  // ============================================================================
  {
    id: '3.1',
    round: 3,
    queryNum: 1,
    prompt: 'What is the average medication delay in minutes across all administrations?',
    expectedQuery: `SELECT AVG(delay_minutes) as avg_delay FROM medications;`,
    preserveOrder: false,
    hints: ['AVG() calculates the mean of a column', 'Use AS to name your result column'],
  },
  {
    id: '3.2',
    round: 3,
    queryNum: 2,
    prompt: 'How many medication administrations had a delay greater than 30 minutes?',
    expectedQuery: `SELECT COUNT(*) as count FROM medications WHERE delay_minutes > 30;`,
    preserveOrder: false,
    hints: ['COUNT(*) counts all matching rows', 'Filter with WHERE before counting'],
  },
  {
    id: '3.3',
    round: 3,
    queryNum: 3,
    prompt: 'What is the average delay by unit? Show each unit with its average delay.',
    expectedQuery: `SELECT p.unit, AVG(m.delay_minutes) as avg_delay
FROM medications m
JOIN patients p ON m.patient_id = p.patient_id
GROUP BY p.unit;`,
    preserveOrder: false,
    hints: ['GROUP BY creates groups for aggregation', 'You need to JOIN to patients to get the unit'],
  },
  {
    id: '3.4',
    round: 3,
    queryNum: 4,
    prompt: 'What percentage of medications are delayed more than 15 minutes?',
    expectedQuery: `SELECT
  ROUND(100.0 * SUM(CASE WHEN delay_minutes > 15 THEN 1 ELSE 0 END) / COUNT(*), 2) as pct_delayed
FROM medications;`,
    preserveOrder: false,
    hints: ['Use CASE WHEN for conditional counting', 'Multiply by 100.0 (not 100) for decimal division'],
  },

  // ============================================================================
  // ROUND 4: The Root Cause (Multi-table JOINs, GROUP BY)
  // ============================================================================
  {
    id: '4.1',
    round: 4,
    queryNum: 1,
    prompt: 'What is the average delay by shift for Cardiac Unit B only?',
    expectedQuery: `SELECT n.shift, AVG(m.delay_minutes) as avg_delay
FROM medications m
JOIN nurses n ON m.administering_nurse_id = n.nurse_id
JOIN patients p ON m.patient_id = p.patient_id
WHERE p.unit = 'Cardiac B'
GROUP BY n.shift;`,
    preserveOrder: false,
    hints: ['You need to join medications → nurses (for shift) and medications → patients (for unit)', 'Filter with WHERE before grouping'],
  },
  {
    id: '4.2',
    round: 4,
    queryNum: 2,
    prompt: 'Which nurses have the highest average delay times? Show the top 10 by name with their average delay.',
    expectedQuery: `SELECT n.name, AVG(m.delay_minutes) as avg_delay
FROM medications m
JOIN nurses n ON m.administering_nurse_id = n.nurse_id
GROUP BY n.nurse_id, n.name
ORDER BY avg_delay DESC
LIMIT 10;`,
    preserveOrder: true,
    hints: ['ORDER BY ... DESC for highest first', 'LIMIT 10 restricts to top 10'],
  },
  {
    id: '4.3',
    round: 4,
    queryNum: 3,
    prompt: 'Is there a correlation between nurse experience and delay? Show average delay grouped by years_experience.',
    expectedQuery: `SELECT n.years_experience, AVG(m.delay_minutes) as avg_delay
FROM medications m
JOIN nurses n ON m.administering_nurse_id = n.nurse_id
GROUP BY n.years_experience
ORDER BY n.years_experience;`,
    preserveOrder: true,
    hints: ['GROUP BY years_experience', 'ORDER BY years_experience to see the trend'],
  },
  {
    id: '4.4',
    round: 4,
    queryNum: 4,
    prompt: 'What is the average delay by hour of day? (Extract the hour from scheduled_time)',
    expectedQuery: `SELECT strftime('%H', scheduled_time) as hour, AVG(delay_minutes) as avg_delay
FROM medications
GROUP BY strftime('%H', scheduled_time)
ORDER BY hour;`,
    preserveOrder: true,
    hints: ['SQLite: strftime("%H", datetime_column) extracts the hour', 'Hours are 00-23 in 24-hour format'],
  },

  // ============================================================================
  // ROUND 5: The Recommendation (Subqueries/CTEs)
  // ============================================================================
  {
    id: '5.1',
    round: 5,
    queryNum: 1,
    prompt: 'Find all nurses whose average delay exceeds the hospital-wide average. Show their name and average delay.',
    expectedQuery: `SELECT n.name, AVG(m.delay_minutes) as avg_delay
FROM medications m
JOIN nurses n ON m.administering_nurse_id = n.nurse_id
GROUP BY n.nurse_id, n.name
HAVING AVG(m.delay_minutes) > (SELECT AVG(delay_minutes) FROM medications);`,
    preserveOrder: false,
    hints: ['Use a subquery to get the hospital average', 'HAVING filters after GROUP BY (unlike WHERE)'],
  },
  {
    id: '5.2',
    round: 5,
    queryNum: 2,
    prompt: 'Rank units by total delayed-minutes (sum of all delays > 15 min). Show unit and total_delayed_minutes.',
    expectedQuery: `SELECT p.unit, SUM(m.delay_minutes) as total_delayed_minutes
FROM medications m
JOIN patients p ON m.patient_id = p.patient_id
WHERE m.delay_minutes > 15
GROUP BY p.unit
ORDER BY total_delayed_minutes DESC;`,
    preserveOrder: true,
    hints: ['Filter delays > 15 in WHERE', 'SUM() adds up all values in the group'],
  },
  {
    id: '5.3',
    round: 5,
    queryNum: 3,
    prompt: 'Create a summary showing each unit\'s total medications, count of delayed (>15min), and delay rate percentage.',
    expectedQuery: `SELECT
  p.unit,
  COUNT(*) as total_meds,
  SUM(CASE WHEN m.delay_minutes > 15 THEN 1 ELSE 0 END) as delayed_count,
  ROUND(100.0 * SUM(CASE WHEN m.delay_minutes > 15 THEN 1 ELSE 0 END) / COUNT(*), 2) as delay_rate
FROM medications m
JOIN patients p ON m.patient_id = p.patient_id
GROUP BY p.unit;`,
    preserveOrder: false,
    hints: ['Use CASE WHEN inside SUM() for conditional counting', 'Calculate percentage: 100.0 * delayed / total'],
  },
  {
    id: '5.4',
    round: 5,
    queryNum: 4,
    prompt: 'Calculate the total delay-minutes that could be saved if Cardiac B\'s average delay matched the hospital average. Show the potential_minutes_saved.',
    expectedQuery: `SELECT
  ROUND(
    (SELECT COUNT(*) FROM medications m JOIN patients p ON m.patient_id = p.patient_id WHERE p.unit = 'Cardiac B') *
    (
      (SELECT AVG(m.delay_minutes) FROM medications m JOIN patients p ON m.patient_id = p.patient_id WHERE p.unit = 'Cardiac B') -
      (SELECT AVG(delay_minutes) FROM medications)
    )
  ) as potential_minutes_saved;`,
    preserveOrder: false,
    hints: [
      'Savings = count_cardiac_b × (avg_cardiac_b - avg_hospital)',
      'Use subqueries for each component',
    ],
  },
];

/**
 * Get tasks for a specific round.
 */
export function getTasksForRound(roundId: number): Task[] {
  return tasks.filter((t) => t.round === roundId);
}

/**
 * Get a specific task by ID.
 */
export function getTask(taskId: string): Task | undefined {
  return tasks.find((t) => t.id === taskId);
}

/**
 * Get total task count.
 */
export function getTotalTaskCount(): number {
  return tasks.length;
}
