'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Clock, ChevronRight, Lightbulb, Play, AlertCircle, Home, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useStudy } from '@/context/StudyContext';
import { SqlEditor } from '@/components/SqlEditor';
import { ResultsTable } from '@/components/ResultsTable';
import { SchemaReference } from '@/components/SchemaReference';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getTotalTaskCount } from '@/data/tasks';
import type { QueryResult } from '@/types';

export default function InvestigatePage() {
  const router = useRouter();
  const {
    session,
    isLoading,
    isDbReady,
    currentTask,
    currentRound,
    runQuery,
    submitAnswer,
    trackHintViewed,
    stats,
  } = useStudy();

  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [homeDialogOpen, setHomeDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showNarrative, setShowNarrative] = useState(true);



  // Reset state when task changes
  useEffect(() => {
    setSql('');
    setResult(null);
    setFeedback(null);
    setShowHints(false);
    // Show narrative at start of each round
    if (session.currentQuery === 1) {
      setShowNarrative(true);
    }
  }, [session.currentRound, session.currentQuery]);

  // Run query (without submission)
  const handleRun = useCallback(async () => {
    if (!sql.trim()) return;
    setFeedback(null);
    const queryResult = await runQuery(sql);
    setResult(queryResult);
  }, [sql, runQuery]);

  // Submit answer for checking
  const handleSubmit = useCallback(async () => {
    if (!sql.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    // Run the query first to show results
    const queryResult = await runQuery(sql);
    setResult(queryResult);

    if (queryResult.error) {
      setFeedback({ type: 'error', message: queryResult.error });
      setIsSubmitting(false);
      return;
    }

    // Check answer
    const { isCorrect, message } = await submitAnswer(sql);

    setFeedback({
      type: isCorrect ? 'success' : 'error',
      message,
    });

    setIsSubmitting(false);

    // If correct, the context will advance the session
    // We show the success message briefly before the UI updates
  }, [sql, runQuery, submitAnswer, isSubmitting]);

  // Loading state
  if (isLoading || !isDbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">Initializing database...</div>
          <div className="text-xs text-muted-foreground">Loading EMR data</div>
        </div>
      </div>
    );
  }

  // No task (shouldn't happen if routing is correct)
  // Guard: show message if no session
  if (!session.studentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">No Active Session</h1>
          <p className="text-muted-foreground mb-6">
            Please start a session from the home page.
          </p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  if (!currentTask || !currentRound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">No task found</div>
      </div>
    );
  }

  const totalTasks = getTotalTaskCount();

  return (
    <div className="bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-primary flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Bozeman Deaconess Hospital Investigation
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentRound.title}: {currentRound.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-medium">
                  {session.studentInfo?.studentId}
                </div>
                <div className="text-muted-foreground">
                  SQL Level: {session.studentInfo?.sqlExpertise}
                </div>
              </div>
              <Dialog open={homeDialogOpen} onOpenChange={setHomeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Home className="w-4 h-4 mr-1" />
                    Home
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Return to Home?</DialogTitle>
                    <DialogDescription>
                      Your progress has been automatically saved. You can return to this investigation at any time.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setHomeDialogOpen(false)}>
                      Stay Here
                    </Button>
                    <Button
                      onClick={() => {
                        toast.success('Session saved');
                        router.push('/');
                      }}
                    >
                      Go to Home
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Progress */}
        <div className="mb-6">
          <ProgressIndicator
            currentRound={session.currentRound}
            currentQuery={session.currentQuery}
            totalCompleted={stats.completedTasks}
          />
        </div>

        {/* Round narrative (shown at start of round) */}
        {showNarrative && session.currentQuery === 1 && (
          <Card className="mb-6 border-accent/30 bg-accent/10 dark:bg-accent/20 dark:border-accent/40">
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {currentRound.contextBefore}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowNarrative(false)}
              >
                Got it, let&apos;s start <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main task area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Task prompt */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Query {currentTask.id}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {stats.completedTasks + 1} of {totalTasks}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{currentTask.prompt}</p>

                {/* Hints toggle */}
                {currentTask.hints && currentTask.hints.length > 0 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!showHints) trackHintViewed();
                        setShowHints(!showHints);
                      }}
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      {showHints ? 'Hide hints' : 'Show hints'}
                    </Button>

                    {showHints && (
                      <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-5 list-disc">
                        {currentTask.hints.map((hint, idx) => (
                          <li key={idx}>{hint}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SQL Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Your Query</label>
                <span className="text-xs text-muted-foreground">
                  Ctrl/Cmd + Enter to run
                </span>
              </div>
              <SqlEditor
                value={sql}
                onChange={setSql}
                onRun={handleRun}
                disabled={isSubmitting}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleRun}
                disabled={!sql.trim() || isSubmitting}
              >
                <Play className="w-4 h-4 mr-2" />
                Run Query
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!sql.trim() || isSubmitting}
              >
                Submit Answer
              </Button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`flex items-center gap-2 p-4 rounded-lg ${
                  feedback.type === 'success'
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {feedback.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )}
                <span className="font-medium">{feedback.message}</span>
              </div>
            )}

            {/* Results table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Results</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResultsTable result={result} className="max-h-80" />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Schema Reference */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <SchemaReference />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
