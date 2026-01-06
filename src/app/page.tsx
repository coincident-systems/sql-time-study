'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Clock } from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { StudentInfo } from '@/types';

// Student ID format: letter + 2 digits + letter + 3 digits (e.g., "a12b345")
const STUDENT_ID_PATTERN = /^[a-zA-Z]\d{2}[a-zA-Z]\d{3}$/;

const SQL_EXPERTISE_OPTIONS = [
  { value: '0', label: 'Never written SQL', description: 'No prior experience with databases' },
  { value: '1', label: 'Done a tutorial', description: 'Completed an online tutorial or intro lesson' },
  { value: '2', label: 'Used in a class or project', description: 'Some hands-on experience' },
  { value: '3', label: 'Use it regularly', description: 'Comfortable writing queries independently' },
];

export default function LandingPage() {
  const router = useRouter();
  const { session, isLoading, startStudy } = useStudy();
  const [studentId, setStudentId] = useState('');
  const [sqlExpertise, setSqlExpertise] = useState<string>('');
  const [error, setError] = useState('');

  // Redirect if session already started
  useEffect(() => {
    if (!isLoading && session.studentInfo) {
      if (session.isComplete) {
        router.push('/complete');
      } else {
        router.push('/investigate');
      }
    }
  }, [isLoading, session, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!studentId.trim()) {
      setError('Please enter your student ID');
      return;
    }

    if (!STUDENT_ID_PATTERN.test(studentId.trim())) {
      setError('Student ID must be in format: a12b345 (letter, 2 digits, letter, 3 digits)');
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
    router.push('/investigate');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
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

        {/* Introduction Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">
              Bozeman Deaconess Hospital Medication Delay Investigation
            </CardTitle>
            <CardDescription>
              Welcome, IE Consultant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              You&apos;ve been brought in to investigate a recurring issue at Bozeman Deaconess Hospital:
              patients on certain units are experiencing significant delays in receiving their
              scheduled medications.
            </p>
            <p>
              Using the hospital&apos;s EMR database, you&apos;ll work through a series of SQL queries to
              identify patterns, find root causes, and quantify the impact. Your performance will
              be automatically logged for learning curve analysis.
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Your performance data will be collected anonymously for educational purposes.
        </p>
      </div>
    </div>
  );
}
