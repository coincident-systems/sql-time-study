'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Clock, Target, RotateCcw, CheckCircle, FileText, FileJson, FileCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudy } from '@/context/StudyContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getTotalTaskCount } from '@/data/tasks';
import type { ExportFormat } from '@/lib/dataLogger';

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string; icon: typeof FileText }[] = [
  {
    value: 'csv',
    label: 'CSV',
    description: 'For Minitab, Excel, R (read.csv)',
    icon: FileText,
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'For Python, R (jsonlite), includes analysis + grading',
    icon: FileJson,
  },
  {
    value: 'yaml',
    label: 'YAML',
    description: 'For R (yaml), Python (pyyaml), includes analysis + grading',
    icon: FileCode,
  },
];

export default function CompletePage() {
  const router = useRouter();
  const { session, isLoading, downloadData, resetStudy, stats } = useStudy();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');

  const handleReset = () => {
    resetStudy();
    router.push('/');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const totalTasks = getTotalTaskCount();

  // Guard: show message if not completed
  if (!session.isComplete) {
    return (
      <div className="flex-1 bg-background py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Investigation Not Complete</h1>
          <p className="text-muted-foreground mb-6">
            You haven&apos;t completed the investigation yet.
          </p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success header */}
        <div className="text-center mb-8 relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-600 mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Investigation Complete!
          </h1>
          <p className="text-muted-foreground">
            Great work, {session.studentInfo?.studentId}
          </p>
        </div>

        {/* Summary stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Performance Summary</CardTitle>
            <CardDescription>
              These statistics will be part of your exported data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Queries Completed</span>
                </div>
                <div className="text-2xl font-bold">
                  {stats.completedTasks} / {totalTasks}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Total Time</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatTime(stats.totalTime)}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Avg Time/Query</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatTime(stats.avgTime)}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Avg Attempts/Query</span>
                </div>
                <div className="text-2xl font-bold">
                  {stats.avgAttempts.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-accent/10 dark:bg-accent/20 rounded-lg text-sm">
              <strong>SQL Experience Level:</strong> {session.studentInfo?.sqlExpertise}
              <span className="text-muted-foreground ml-2">
                (This will be used as a covariate in your regression analysis)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Download section with format picker */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Download Your Data</CardTitle>
            <CardDescription>
              Export your performance data for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Format selector */}
            <div className="grid grid-cols-3 gap-3">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedFormat === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedFormat(opt.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`font-medium text-sm ${isSelected ? 'text-primary' : ''}`}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Format-specific info */}
            {selectedFormat === 'csv' && (
              <p className="text-sm text-muted-foreground">
                Includes: student_id, sql_expertise, round, query_num, task_id,
                query_sequence, time_sec, total_attempts, submitted_query, completed_at.
              </p>
            )}
            {(selectedFormat === 'json' || selectedFormat === 'yaml') && (
              <p className="text-sm text-muted-foreground">
                Includes all observation data plus: learning curve regression (exponent, rate, R&sup2;),
                per-round summaries, task difficulty scores, auto-grading rubric (score, letter grade,
                criteria breakdown), and R/Python code snippets.
              </p>
            )}

            <Button size="lg" className="w-full" onClick={() => downloadData(selectedFormat)}>
              <Download className="w-4 h-4 mr-2" />
              Download {selectedFormat.toUpperCase()}
            </Button>
          </CardContent>
        </Card>

        {/* Next steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>What to do with your data</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                <strong>Open Minitab</strong> and import your CSV file
              </li>
              <li>
                <strong>Create new columns:</strong>
                <ul className="ml-6 mt-1 list-disc list-inside text-muted-foreground">
                  <li>log_time = ln(time_sec)</li>
                  <li>log_sequence = ln(query_sequence)</li>
                </ul>
              </li>
              <li>
                <strong>Run regression:</strong> Response = log_time, Predictors = log_sequence, sql_expertise, round
              </li>
              <li>
                <strong>Interpret:</strong> The coefficient on log_sequence is your learning exponent (b).
                Calculate learning rate = 2^b
              </li>
              <li>
                <strong>Write your memo:</strong> Discuss what factors predicted your performance
                and implications for training program design
              </li>
            </ol>

            {(selectedFormat === 'json' || selectedFormat === 'yaml') && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <strong>Tip:</strong> The {selectedFormat.toUpperCase()} export already includes
                the learning curve regression, so you can compare your Minitab results against
                the pre-computed analysis.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investigation findings recap */}
        <Card className="mb-6 border-accent/30 bg-accent/10 dark:bg-accent/20 dark:border-accent/40">
          <CardHeader>
            <CardTitle>Investigation Findings Recap</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              Your SQL queries revealed that <strong>Cardiac Unit B</strong> had significantly
              higher medication delays than other units. Night shift showed worse performance,
              and there was an inverse correlation between nurse experience and delay times.
            </p>
            <p>
              These findings suggest targeted interventions: additional support for less
              experienced nurses during night shifts on high-volume units could substantially
              reduce medication delays.
            </p>
            <p className="text-muted-foreground">
              You experienced this investigation firsthand—and your own learning curve data
              will now demonstrate how you improved at the analytical SQL skills needed for
              this type of healthcare operations work.
            </p>
          </CardContent>
        </Card>

        {/* Reset option */}
        <div className="text-center">
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over (clears all data)
          </Button>
        </div>
      </div>
    </div>
  );
}
