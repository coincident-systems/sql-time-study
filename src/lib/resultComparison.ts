import type { QueryResult, ComparisonResult } from '@/types';
import { executeQuery } from './database';

/**
 * Normalize a value for comparison:
 * - Round floats to 2 decimal places
 * - Convert to string for consistent comparison
 */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    // Round floats to 2 decimal places
    return Number(value.toFixed(2)).toString();
  }
  return String(value);
}

/**
 * Normalize column names (lowercase for comparison).
 */
function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Normalize a row for comparison.
 */
function normalizeRow(row: unknown[]): string[] {
  return row.map(normalizeValue);
}

/**
 * Sort rows for comparison (when order doesn't matter).
 */
function sortRows(rows: unknown[][]): string[][] {
  return rows
    .map(normalizeRow)
    .sort((a, b) => {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const cmp = (a[i] || '').localeCompare(b[i] || '');
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
}

/**
 * Compare two result sets.
 * @param studentResult - The student's query result
 * @param expectedResult - The expected result from reference query
 * @param preserveOrder - If true, row order must match
 */
export function compareResults(
  studentResult: QueryResult,
  expectedResult: QueryResult,
  preserveOrder: boolean = false
): ComparisonResult {
  // Check for errors
  if (studentResult.error) {
    return {
      isMatch: false,
      studentResult,
      expectedResult,
      message: `Query error: ${studentResult.error}`,
    };
  }

  // Compare column count
  if (studentResult.columns.length !== expectedResult.columns.length) {
    return {
      isMatch: false,
      studentResult,
      expectedResult,
      message: `Column count mismatch: got ${studentResult.columns.length}, expected ${expectedResult.columns.length}`,
    };
  }

  // Compare row count
  if (studentResult.values.length !== expectedResult.values.length) {
    return {
      isMatch: false,
      studentResult,
      expectedResult,
      message: `Row count mismatch: got ${studentResult.values.length}, expected ${expectedResult.values.length}`,
    };
  }

  // Normalize column names and check they match (order-independent)
  const studentCols = studentResult.columns.map(normalizeColumnName).sort();
  const expectedCols = expectedResult.columns.map(normalizeColumnName).sort();

  if (JSON.stringify(studentCols) !== JSON.stringify(expectedCols)) {
    return {
      isMatch: false,
      studentResult,
      expectedResult,
      message: `Column names don't match. Got: ${studentResult.columns.join(', ')}`,
    };
  }

  // For comparison, we need to align columns if they're in different order
  // Create a mapping from expected column order to student column order
  const studentColMap = new Map<string, number>();
  studentResult.columns.forEach((col, idx) => {
    studentColMap.set(normalizeColumnName(col), idx);
  });

  const colMapping = expectedResult.columns.map((col) => {
    const normalizedCol = normalizeColumnName(col);
    return studentColMap.get(normalizedCol) ?? -1;
  });

  // Reorder student values to match expected column order
  const reorderedStudentValues = studentResult.values.map((row) =>
    colMapping.map((idx) => (idx >= 0 ? row[idx] : null))
  );

  // Compare values
  if (preserveOrder) {
    // Row order must match
    const normalizedStudent = reorderedStudentValues.map(normalizeRow);
    const normalizedExpected = expectedResult.values.map(normalizeRow);

    for (let i = 0; i < normalizedExpected.length; i++) {
      if (JSON.stringify(normalizedStudent[i]) !== JSON.stringify(normalizedExpected[i])) {
        return {
          isMatch: false,
          studentResult,
          expectedResult,
          message: `Row ${i + 1} doesn't match. Check your ORDER BY clause.`,
        };
      }
    }
  } else {
    // Sort both and compare
    const sortedStudent = sortRows(reorderedStudentValues);
    const sortedExpected = sortRows(expectedResult.values);

    if (JSON.stringify(sortedStudent) !== JSON.stringify(sortedExpected)) {
      return {
        isMatch: false,
        studentResult,
        expectedResult,
        message: 'Results don\'t match. Check your query logic.',
      };
    }
  }

  return {
    isMatch: true,
    studentResult,
    expectedResult,
    message: 'Correct!',
  };
}

/**
 * Run comparison against expected query.
 */
export async function checkQueryResult(
  studentQuery: string,
  expectedQuery: string,
  preserveOrder: boolean = false
): Promise<ComparisonResult> {
  const [studentResult, expectedResult] = await Promise.all([
    executeQuery(studentQuery),
    executeQuery(expectedQuery),
  ]);

  return compareResults(studentResult, expectedResult, preserveOrder);
}
