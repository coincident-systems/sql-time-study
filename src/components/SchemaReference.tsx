'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Database, Key, Link } from 'lucide-react';
import { tableSchemas } from '@/data/schema';
import { Button } from '@/components/ui/button';

interface SchemaReferenceProps {
  className?: string;
}

/**
 * Collapsible schema reference sidebar.
 */
export function SchemaReference({ className = '' }: SchemaReferenceProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(
    new Set(['medications', 'patients']) // Start with key tables expanded
  );

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTables(new Set(tableSchemas.map((t) => t.name)));
  };

  const collapseAll = () => {
    setExpandedTables(new Set());
  };

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium">
          <Database className="w-4 h-4 text-primary" />
          Schema Reference
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-7 px-2">
            Expand
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-7 px-2">
            Collapse
          </Button>
        </div>
      </div>

      <div className="max-h-[600px] overflow-auto">
        {tableSchemas.map((table) => {
          const isExpanded = expandedTables.has(table.name);

          return (
            <div key={table.name} className="border-b border-border last:border-b-0">
              <button
                onClick={() => toggleTable(table.name)}
                className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-mono font-medium text-primary">{table.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {table.columns.length} cols
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-muted-foreground mb-2 ml-6">
                    {table.description}
                  </p>
                  <div className="ml-6 space-y-1">
                    {table.columns.map((col) => (
                      <div
                        key={col.name}
                        className="flex items-start gap-2 text-sm py-1"
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          {col.isPrimaryKey && (
                            <Key className="w-3 h-3 text-yellow-500 flex-shrink-0" aria-label="Primary Key" />
                          )}
                          {col.isForeignKey && (
                            <Link className="w-3 h-3 text-blue-500 flex-shrink-0" aria-label="Foreign Key" />
                          )}
                          <span className="font-mono text-foreground">{col.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                          {col.type}
                        </span>
                        {col.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            {col.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-border text-xs text-muted-foreground flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Key className="w-3 h-3 text-yellow-500" /> Primary Key
        </span>
        <span className="flex items-center gap-1">
          <Link className="w-3 h-3 text-blue-500" /> Foreign Key
        </span>
      </div>
    </div>
  );
}
