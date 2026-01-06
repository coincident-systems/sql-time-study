'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import posthog from 'posthog-js';
import type { AnalyticsEvent, UserProperties } from './types';

// ============================================================================
// Configuration
// ============================================================================

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const IS_ENABLED = typeof window !== 'undefined' && !!POSTHOG_KEY;

// ============================================================================
// Analytics Context
// ============================================================================

interface AnalyticsContextType {
  isEnabled: boolean;
  track: <T extends AnalyticsEvent>(event: T['event'], properties: Omit<T, 'event'>) => void;
  identify: (studentId: string, properties?: Partial<UserProperties>) => void;
  setUserProperties: (properties: Partial<UserProperties>) => void;
  reset: () => void;
  getSessionId: () => string;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

// ============================================================================
// Session ID Generator
// ============================================================================

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Analytics Provider
// ============================================================================

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const sessionIdRef = useRef<string>('');
  const initializedRef = useRef(false);

  // Initialize PostHog
  useEffect(() => {
    if (!IS_ENABLED || initializedRef.current) return;

    posthog.init(POSTHOG_KEY!, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: false, // We'll track manually for more control
      disable_session_recording: true, // Enable if you want session replays
      loaded: (ph) => {
        // Generate session ID on load
        sessionIdRef.current = generateSessionId();

        // In development, enable debug mode
        if (process.env.NODE_ENV === 'development') {
          ph.debug();
        }
      },
    });

    initializedRef.current = true;

    // Cleanup on unmount
    return () => {
      // PostHog doesn't need explicit cleanup
    };
  }, []);

  // Track event
  const track = <T extends AnalyticsEvent>(
    event: T['event'],
    properties: Omit<T, 'event'>
  ) => {
    if (!IS_ENABLED) {
      // Log to console in dev when PostHog not configured
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics]', event, properties);
      }
      return;
    }

    posthog.capture(event, {
      ...properties,
      session_id: sessionIdRef.current,
      timestamp: new Date().toISOString(),
    });
  };

  // Identify user
  const identify = (studentId: string, properties?: Partial<UserProperties>) => {
    if (!IS_ENABLED) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Identify:', studentId, properties);
      }
      return;
    }

    posthog.identify(studentId, {
      ...properties,
      student_id: studentId,
      last_seen: new Date().toISOString(),
    });
  };

  // Set user properties (for updating)
  const setUserProperties = (properties: Partial<UserProperties>) => {
    if (!IS_ENABLED) return;

    posthog.people.set(properties);
  };

  // Reset (on logout/study reset)
  const reset = () => {
    if (!IS_ENABLED) return;

    posthog.reset();
    sessionIdRef.current = generateSessionId();
  };

  // Get current session ID
  const getSessionId = () => sessionIdRef.current;

  const value: AnalyticsContextType = {
    isEnabled: IS_ENABLED,
    track,
    identify,
    setUserProperties,
    reset,
    getSessionId,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
