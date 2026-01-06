'use client';

import type { QueryResult } from '@/types';

interface ResultsTableProps {
  result: QueryResult | null;
  className?: string;
  maxRows?: number;
}

/**
 * Display query results as a table.
 */
export function ResultsTable({
  result,
  className = '',
  maxRows = 100,
}: ResultsTableProps) {
  if (!result) {
    return (
      <div className={`text-muted-foreground italic p-4 ${className}`}>
        Run a query to see results
      </div>
    );
  }

  if (result.error) {
    return (
      <div className={`p-4 bg-destructive/10 text-destructive rounded-lg ${className}`}>
        <div className="font-medium mb-1">Error</div>
        <div className="font-mono text-sm">{result.error}</div>
      </div>
    );
  }

  if (result.values.length === 0) {
    return (
      <div className={`text-muted-foreground p-4 ${className}`}>
        Query returned no results
      </div>
    );
  }

  const displayRows = result.values.slice(0, maxRows);
  const hasMore = result.values.length > maxRows;

  return (
    <div className={`overflow-auto ${className}`}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted">
            {result.columns.map((col, idx) => (
              <th
                key={idx}
                className="text-left px-3 py-2 font-medium border-b border-border"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="hover:bg-muted/50 transition-colors"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-3 py-2 border-b border-border font-mono"
                >
                  {cell === null ? (
                    <span className="text-muted-foreground italic">NULL</span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="px-3 py-2 text-sm text-muted-foreground border-t border-border bg-muted/50">
        {result.values.length} row{result.values.length !== 1 ? 's' : ''} returned
        {hasMore && ` (showing first ${maxRows})`}
      </div>
    </div>
  );
}
