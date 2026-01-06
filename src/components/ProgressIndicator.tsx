'use client';

import { Progress } from '@/components/ui/progress';
import { rounds } from '@/data/rounds';
import { getTasksForRound, getTotalTaskCount } from '@/data/tasks';

interface ProgressIndicatorProps {
  currentRound: number;
  currentQuery: number;
  totalCompleted: number;
  className?: string;
}

/**
 * Progress indicator showing round and query progress.
 */
export function ProgressIndicator({
  currentRound,
  currentQuery,
  totalCompleted,
  className = '',
}: ProgressIndicatorProps) {
  const round = rounds.find((r) => r.id === currentRound);
  const tasksInRound = getTasksForRound(currentRound);
  const totalTasks = getTotalTaskCount();

  const overallProgress = (totalCompleted / totalTasks) * 100;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium">
            {totalCompleted} / {totalTasks} queries
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Current position */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="font-medium">Round {currentRound}</span>
          <span className="text-muted-foreground"> of {rounds.length}</span>
          {round && (
            <span className="text-muted-foreground"> — {round.title}</span>
          )}
        </div>
        <div>
          <span className="font-medium">Query {currentQuery}</span>
          <span className="text-muted-foreground"> of {tasksInRound.length}</span>
        </div>
      </div>

      {/* SQL skill indicator */}
      {round && (
        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
          Focus: {round.subtitle}
        </div>
      )}
    </div>
  );
}
