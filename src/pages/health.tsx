import { healthCheck } from '../health';

export function HealthCheckPage() {
  const data = healthCheck();

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="panel w-full max-w-xl p-6" aria-labelledby="health-heading">
        <div className="eyebrow">Public service status</div>
        <h1 id="health-heading" className="mt-2 text-2xl font-bold text-white">
          StudioFlow Health Check
        </h1>
        <pre
          className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-black/20 p-4 text-sm text-slate-300"
          data-testid="health-payload"
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </section>
    </main>
  );
}
