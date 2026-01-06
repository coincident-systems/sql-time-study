declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  interface Database {
    run(sql: string, params?: unknown[]): Database;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    each<T>(
      sql: string,
      params: unknown[],
      callback: (row: T) => void,
      done: () => void
    ): Database;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getAsObject(params?: unknown[]): Record<string, unknown>;
    get(params?: unknown[]): unknown[];
    getColumnNames(): string[];
    free(): boolean;
    reset(): void;
    run(params?: unknown[]): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;

  export default initSqlJs;
  export { Database, SqlJsStatic, QueryExecResult, Statement, SqlJsConfig };
}
