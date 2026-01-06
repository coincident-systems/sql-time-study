import type { Round } from '@/types';

/**
 * Round definitions with narrative context.
 * Structured for future CMS integration (Strapi).
 */
export const rounds: Round[] = [
  {
    id: 1,
    title: 'The Patient',
    subtitle: 'Basic SELECT/WHERE',
    contextBefore: `Welcome to Bozeman Deaconess Hospital. You've been brought in as an Industrial Engineering consultant to investigate a recurring issue: patients on certain units are experiencing significant delays in receiving their scheduled medications.

A nurse on Cardiac Unit B reported that a patient named John Martinez experienced a medication delay yesterday. Your first task is to locate this patient in the EMR system.`,
    contextAfter: `Good work. You've found John Martinez (patient_id 247) and confirmed multiple medication delays in his record. The data shows delays ranging from 20 to 45 minutes—well above acceptable thresholds.

But is this an isolated case, or a systemic problem? Let's dig deeper into his history.`,
  },
  {
    id: 2,
    title: 'The History',
    subtitle: 'Single JOINs',
    contextBefore: `You've identified the patient. Now you need to pull his complete medical history to understand the context. This requires combining data from multiple tables—a core skill in EMR analysis.

Patient 247's record shows multiple encounters and medications. Let's see who's been involved in his care.`,
    contextAfter: `The picture is becoming clearer. Patient 247 has had multiple encounters across different providers, and several nurses have administered his medications with varying delay times.

Time to zoom out and see if this is affecting other patients too.`,
  },
  {
    id: 3,
    title: 'The Pattern',
    subtitle: 'Aggregations',
    contextBefore: `Individual patient stories are compelling, but leadership needs data. How widespread is the medication delay problem? What's the hospital-wide average? Which units are performing worst?

Let's aggregate the data and find the patterns.`,
    contextAfter: `The numbers don't lie. Hospital-wide average delay is around 18 minutes, but Cardiac Unit B is averaging over 30 minutes—nearly double. This isn't a one-patient problem.

Now we need to find the root cause. Is it staffing? Shift timing? Individual performance?`,
  },
  {
    id: 4,
    title: 'The Root Cause',
    subtitle: 'Multi-table JOINs, GROUP BY',
    contextBefore: `Cardiac Unit B has the worst delays. But why? Is it the shift schedule? The nurse staffing? The complexity of cardiac patients?

To answer these questions, you'll need to join multiple tables and slice the data different ways. This is where SQL becomes a real investigative tool.`,
    contextAfter: `Several factors are emerging: night shift has significantly worse delays, and there's a clear correlation with nurse experience levels. Less experienced nurses are struggling with medication timing, especially during overnight hours.

Time to quantify the impact and prepare your recommendations.`,
  },
  {
    id: 5,
    title: 'The Recommendation',
    subtitle: 'Subqueries/CTEs',
    contextBefore: `You've identified the pattern and the likely causes. Now leadership wants to know: what's the actual impact, and what would happen if we fixed it?

These final queries require more advanced SQL—subqueries and conditional aggregations. You'll calculate potential savings and create summary reports.`,
    contextAfter: `Investigation complete. Your analysis shows that targeted interventions on Cardiac Unit B—especially additional support during night shifts for less experienced nurses—could reduce total delay-minutes by thousands per month.

Download your performance data below and proceed to the Minitab analysis.`,
  },
];
