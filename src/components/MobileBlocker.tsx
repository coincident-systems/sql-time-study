'use client';

import { useState, useEffect } from 'react';
import { Monitor, Tablet } from 'lucide-react';

const MIN_WIDTH = 768; // iPad portrait and up

export function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [isTooSmall, setIsTooSmall] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkWidth = () => {
      setIsTooSmall(window.innerWidth < MIN_WIDTH);
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Don't render blocker until mounted (avoid hydration mismatch)
  if (!mounted) {
    return <>{children}</>;
  }

  if (isTooSmall) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
            <Tablet className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-semibold text-foreground mb-3">
            Larger Screen Required
          </h1>

          <p className="text-muted-foreground mb-6">
            This SQL lab requires a tablet or larger display to work with the code editor effectively.
          </p>

          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Tablet className="w-4 h-4" />
              <span>iPad</span>
            </div>
            <span>/</span>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span>Desktop</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Rotate your tablet to landscape, or switch to a computer.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
