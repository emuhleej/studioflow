export interface HealthCheckResult {
  status: 'ok';
  timestamp: string;
  version: string;
}

export function healthCheck(now: () => Date = () => new Date()): HealthCheckResult {
  return {
    status: 'ok',
    timestamp: now().toISOString(),
    version: '0.1.0',
  };
}
