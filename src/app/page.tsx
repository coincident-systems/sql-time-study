'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Play,
  Download,
  Trash2,
  Target,
  RotateCcw,
} from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { rounds } from '@/data/rounds';
import { getTasksForRound, getTotalTaskCount } from '@/data/tasks';
import type { StudentInfo } from '@/types';

// Student ID format: letter + 2 digits + letter + 3 digits (e.g., "a12b345")
const STUDENT_ID_PATTERN = /^[a-zA-Z]\d{2}[a-zA-Z]\d{3}$/;

const SQL_EXPERTISE_LABELS = [
  'Never written SQL',
  'Done a tutorial',
  'Used in a class or project',
  'Use it regularly',
];

const SQL_EXPERTISE_OPTIONS = [
  {
    value: '0',
    label: 'Never written SQL',
    description: 'No prior experience with databases',
  },
  {
    value: '1',
    label: 'Done a tutorial',
    description: 'Completed an online tutorial or intro lesson',
  },
  {
    value: '2',
    label: 'Used in a class or project',
    description: 'Some hands-on experience',
  },
  {
    value: '3',
    label: 'Use it regularly',
    description: 'Comfortable writing queries independently',
  },
];

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

// ============================================================================
// Session Manager - shown when a student has an active (incomplete) session
// ============================================================================

function SessionManager() {
  const router = useRouter();
  const { session, stats, downloadData, resetStudy } = useStudy();
  const [confirmReset, setConfirmReset] = useState(false);

  const totalTasks = getTotalTaskCount();
  const progressPct = (stats.completedTasks / totalTasks) * 100;

  const currentRound = rounds.find((r) => r.id === session.currentRound);
  const tasksInRound = getTasksForRound(session.currentRound);

  // Figure out which round milestones are complete
  const roundProgress = rounds.map((round) => {
    const roundTasks = getTasksForRound(round.id);
    const completedInRound = session.attempts.filter(
      (a) => a.round === round.id && a.isCorrect
    );
    const uniqueCompleted = new Set(completedInRound.map((a) => a.taskId));
    return {
      ...round,
      total: roundTasks.length,
      completed: uniqueCompleted.size,
      isCurrent: round.id === session.currentRound,
      isDone: uniqueCompleted.size >= roundTasks.length,
    };
  });

  const handleResume = () => {
    router.push('/investigate');
  };

  const handleReset = () => {
    resetStudy();
    setConfirmReset(false);
  };

  return (
    <>
      {/* Active session card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Session In Progress</CardTitle>
              <CardDescription>
                {session.studentInfo?.studentId} &middot; SQL Level{' '}
                {session.studentInfo?.sqlExpertise} (
                {SQL_EXPERTISE_LABELS[session.studentInfo?.sqlExpertise ?? 0]})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {stats.completedTasks} / {totalTasks} queries (
                {Math.round(progressPct)}%)
              </span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </div>

          {/* Round breakdown */}
          <div className="space-y-2">
            {roundProgress.map((round) => (
              <div
                key={round.id}
                className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                  round.isCurrent
                    ? 'bg-accent/15 border border-accent/30 dark:bg-accent/20 dark:border-accent/40'
                    : round.isDone
                      ? 'bg-accent/5 dark:bg-accent/10 text-muted-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  {round.isDone ? (
                    <span className="text-green-600 dark:text-green-400 text-xs">
                      &#10003;
                    </span>
                  ) : round.isCurrent ? (
                    <span className="text-primary text-xs">&#9656;</span>
                  ) : (
                    <span className="text-xs opacity-30">&#9675;</span>
                  )}
                  <span className={round.isCurrent ? 'font-medium' : ''}>
                    Round {round.id}: {round.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {round.subtitle}
                  </span>
                </div>
                <span className="text-xs tabular-nums">
                  {round.completed}/{round.total}
                </span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Time</span>
              </div>
              <div className="font-semibold text-sm">
                {formatTime(stats.totalTime)}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Target className="w-3.5 h-3.5" />
                <span className="text-xs">Attempts</span>
              </div>
              <div className="font-semibold text-sm">
                {stats.totalAttempts}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Avg/Query</span>
              </div>
              <div className="font-semibold text-sm">
                {stats.completedTasks > 0 ? formatTime(stats.avgTime) : '--'}
              </div>
            </div>
          </div>

          {/* Current position callout */}
          {!session.isComplete && currentRound && (
            <div className="text-sm bg-muted/30 rounded-lg p-3">
              <span className="text-muted-foreground">Next up: </span>
              <span className="font-medium">
                Round {session.currentRound} ({currentRound.title})
              </span>
              <span className="text-muted-foreground">
                {' '}
                &mdash; Query {session.currentQuery} of {tasksInRound.length}
              </span>
            </div>
          )}

          {session.isComplete && (
            <div className="text-sm bg-accent/10 dark:bg-accent/20 border border-accent/30 dark:border-accent/40 rounded-lg p-3 text-center">
              <span className="font-medium text-accent-foreground">
                Investigation Complete!
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                All {totalTasks} queries solved. Download your data for Minitab analysis.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {!session.isComplete && (
              <Button size="lg" className="w-full" onClick={handleResume}>
                <Play className="w-4 h-4 mr-2" />
                {stats.completedTasks === 0
                  ? 'Begin Investigation'
                  : 'Resume Investigation'}
              </Button>
            )}

            <div className="flex gap-3">
              <Button
                variant={session.isComplete ? "default" : "outline"}
                size={session.isComplete ? "lg" : "default"}
                className="flex-1"
                onClick={downloadData}
                disabled={stats.completedTasks === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                {session.isComplete ? 'Download Data for Minitab' : 'Export Progress'}
              </Button>

              {!confirmReset ? (
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmReset(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Confirm Reset
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {stats.completedTasks > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Export saves your progress so far ({stats.completedTasks} queries)
                as CSV for Minitab. You can continue and export again when
                finished.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// Intake Form - shown when no session exists
// ============================================================================

function IntakeForm() {
  const { startStudy } = useStudy();
  const [studentId, setStudentId] = useState('');
  const [sqlExpertise, setSqlExpertise] = useState<string>('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!studentId.trim()) {
      setError('Please enter your student ID');
      return;
    }

    if (!STUDENT_ID_PATTERN.test(studentId.trim())) {
      setError(
        'Student ID must be in format: a12b345 (letter, 2 digits, letter, 3 digits)'
      );
      return;
    }

    if (!sqlExpertise) {
      setError('Please select your SQL experience level');
      return;
    }

    const studentInfo: StudentInfo = {
      studentId: studentId.trim(),
      sqlExpertise: parseInt(sqlExpertise, 10) as 0 | 1 | 2 | 3,
    };

    startStudy(studentInfo);
    // Don't redirect -- the page re-renders to show SessionManager,
    // giving students a chance to review before starting.
  };

  return (
    <>
      {/* Introduction Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">
            Bozeman Deaconess Hospital Medication Delay Investigation
          </CardTitle>
          <CardDescription>Welcome, IE Consultant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            You&apos;ve been brought in to investigate a recurring issue at
            Bozeman Deaconess Hospital: patients on certain units are
            experiencing significant delays in receiving their scheduled
            medications.
          </p>
          <p>
            Using the hospital&apos;s EMR database, you&apos;ll work through a
            series of SQL queries to identify patterns, find root causes, and
            quantify the impact. Your performance will be automatically logged
            for learning curve analysis.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">What to expect:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>5 rounds of progressively harder SQL queries</li>
              <li>~15-18 queries total (45-60 minutes)</li>
              <li>Schema reference available throughout</li>
              <li>Your timing data will be exported for Minitab analysis</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Intake Form */}
      <Card>
        <CardHeader>
          <CardTitle>Before We Begin</CardTitle>
          <CardDescription>
            Please enter your information to start the investigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student ID */}
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                type="text"
                placeholder="e.g., a12b345"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toLowerCase())}
                className="max-w-xs font-mono"
                maxLength={7}
              />
            </div>

            {/* SQL Experience */}
            <div className="space-y-3">
              <Label>SQL Experience Level</Label>
              <p className="text-sm text-muted-foreground">
                How would you describe your prior experience with SQL?
              </p>
              <RadioGroup
                value={sqlExpertise}
                onValueChange={setSqlExpertise}
                className="grid gap-3"
              >
                {SQL_EXPERTISE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`expertise-${option.value}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`expertise-${option.value}`}
                      className="cursor-pointer flex-1"
                    >
                      <div className="font-medium">
                        {option.value} - {option.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {option.description}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button type="submit" size="lg" className="w-full">
              Begin Investigation
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// Landing Page
// ============================================================================

export default function LandingPage() {
  const { session, isLoading } = useStudy();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasActiveSession = session.studentInfo && !session.isComplete;
  const hasCompletedSession = session.studentInfo && session.isComplete;

  return (
    <div className="flex-1 bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center justify-center gap-3">
            <Clock className="w-8 h-8" />
            SQL Time Study Lab
          </h1>
          <p className="text-muted-foreground">
            EIND 313: Work Design & Analysis
          </p>
        </div>

        {/* Conditional content */}
        {hasActiveSession || hasCompletedSession ? <SessionManager /> : <IntakeForm />}

        {/* Data notice */}
        {!hasActiveSession && !hasCompletedSession && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Your performance data will be collected anonymously for educational
            purposes.
          </p>
        )}
      </div>
    </div>
  );
}
