import { recordClientError } from './error-logging';

type SafeContextValue = string | number | boolean | null;

export interface ErrorReport {
  message: string;
  stack?: string | undefined;
  context?: Record<string, SafeContextValue> | undefined;
  timestamp: string;
  userAgent: string;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error.slice(0, 2_000));
  return new Error('A non-Error value was captured.');
}

function sanitizeContext(
  context: Record<string, unknown> | undefined
): Record<string, SafeContextValue> | undefined {
  if (!context) return undefined;

  return Object.fromEntries(
    Object.entries(context)
      .slice(0, 20)
      .map(([key, value]) => {
        const safeKey = key.slice(0, 80);
        if (typeof value === 'string') return [safeKey, value.slice(0, 240)];
        if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
          return [safeKey, value];
        }
        return [safeKey, '[redacted]'];
      })
  );
}

function contextLabel(context: Record<string, SafeContextValue> | undefined): string {
  const type = context?.type;
  return typeof type === 'string' && /^[a-z0-9_-]{1,60}$/i.test(type) ? type : 'client-error';
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private reports: ErrorReport[] = [];
  private readonly maxReports = 50;

  static getInstance(): ErrorTracker {
    ErrorTracker.instance ??= new ErrorTracker();
    return ErrorTracker.instance;
  }

  captureError(error: unknown, context?: Record<string, unknown>): ErrorReport {
    const normalizedError = normalizeError(error);
    const safeContext = sanitizeContext(context);
    const report: ErrorReport = {
      message: normalizedError.message.slice(0, 2_000),
      ...(normalizedError.stack ? { stack: normalizedError.stack.slice(0, 8_000) } : {}),
      ...(safeContext ? { context: safeContext } : {}),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.slice(0, 500),
    };

    this.reports.push(report);
    if (this.reports.length > this.maxReports) this.reports.shift();

    void recordClientError(normalizedError, contextLabel(safeContext));
    return report;
  }

  getReports(): ErrorReport[] {
    return [...this.reports];
  }

  clearReports(): void {
    this.reports = [];
  }
}

export const errorTracker = ErrorTracker.getInstance();
