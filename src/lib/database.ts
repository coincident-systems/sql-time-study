import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { SCHEMA_SQL } from '@/data/schema';
import { generateSeedSQL } from '@/data/seed';
import type { QueryResult } from '@/types';

let db: SqlJsDatabase | null = null;
let initPromise: Promise<SqlJsDatabase> | null = null;

/**
 * Initialize the sql.js database with schema and seed data.
 * Returns a singleton database instance.
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  // Return existing if available
  if (db) return db;

  // Return pending init if in progress
  if (initPromise) return initPromise;

  // Start initialization
  initPromise = (async () => {
    try {
      // Load sql.js WASM
      const SQL = await initSqlJs({
        locateFile: (file) => `/${file}`,
      });

      // Create new database
      db = new SQL.Database();

      // Run schema creation
      db.run(SCHEMA_SQL);

      // Generate and run seed data
      const seedSQL = generateSeedSQL();
      db.run(seedSQL);

      console.log('Database initialized successfully');
      return db;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Execute a query and return results.
 */
export async function executeQuery(sql: string): Promise<QueryResult> {
  const database = await initDatabase();

  try {
    const results = database.exec(sql);

    if (results.length === 0) {
      return { columns: [], values: [] };
    }

    // Return first result set
    return {
      columns: results[0].columns,
      values: results[0].values,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      columns: [],
      values: [],
      error: message,
    };
  }
}

/**
 * Get the database instance (must be initialized first).
 */
export function getDatabase(): SqlJsDatabase | null {
  return db;
}

/**
 * Reset the database (for testing).
 */
export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
    initPromise = null;
  }
}
