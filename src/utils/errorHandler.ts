/**
 * Centralized error reporting utility.
 *
 * In development: structured console.error with component context.
 * In production: ready for Sentry integration (checks window.__SENTRY__).
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  canvasId?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __SENTRY__?: unknown;
  }
}

export function reportError(error: unknown, context: ErrorContext = {}): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const { component, action, ...extra } = context;

  // Structured logging in development
  if (import.meta.env.DEV) {
    const prefix = [component, action].filter(Boolean).join(' > ');
    console.error(`[${prefix || 'app'}]`, errorObj.message, extra);
    return;
  }

  // Production: send to Sentry if available
  if (typeof window !== 'undefined' && window.__SENTRY__) {
    try {
      // @ts-expect-error Sentry may be loaded via script tag
      window.Sentry?.captureException(errorObj, {
        tags: { component, action },
        extra,
      });
    } catch {
      // Sentry not properly initialized — fall through to console
    }
  }

  // Fallback: structured console.error
  console.error(`[${component || 'app'}]`, errorObj.message);
}
