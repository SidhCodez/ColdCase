export interface LogStepEvent {
  step: string;
  status: 'ok' | 'fail' | 'skip';
  duration_ms?: number;
  [key: string]: unknown;
}

export function logStep(event: LogStepEvent): void {
  const line = JSON.stringify(event);
  console.log(line);
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  if (process.env.VERBOSE === 'true') {
    console.warn(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  }
}

export function logError(message: string, error?: unknown): void {
  console.error(`[ERROR] ${message}`, error instanceof Error ? error.message : error);
}
