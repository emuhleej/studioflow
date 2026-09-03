import {
  ArrowRight,
  Clock3,
  Coins,
  Film,
  Inbox,
  Lightbulb,
  PlayCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  B2_UPLOAD_BLOCK_BYTES,
  B2_WARNING_BYTES,
  getActiveStorageBytes,
  getEpisodeTotals,
} from '../lib/domain';
import { formatBytes, formatCurrency, formatDuration, titleCase } from '../lib/format';
import { useStudio } from '../state/studio-store';
import { StatusBadge } from '../components/status';
import { Button, EmptyState, PageHeading } from '../components/ui';

export function CreatorHQPage() {
  const { data, convertCaptureToEpisode } = useStudio();
  const activeEpisodes = data.episodes.filter(
    (episode) => !episode.archivedAt && episode.status !== 'published'
  );
  const published = data.episodes.filter((episode) => episode.status === 'published');
  const totalMinutes = data.timeEntries.reduce((sum, entry) => sum + entry.minutes, 0);
  const totalCost = data.costEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
  const storage = getActiveStorageBytes(data);
  const storagePercent = Math.min(100, (storage / B2_UPLOAD_BLOCK_BYTES) * 100);
  const pendingCaptures = data.captures.filter((capture) => !capture.convertedToEpisodeId);
  const defaultSeries = data.series.find((series) => !series.archivedAt);
  const recentEpisodes = [...data.episodes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div>
      <PageHeading
        eyebrow="Creator HQ"
        title="Your studio, at a glance."
        description="The important signal is not how busy the studio feels—it is how efficiently ideas become published episodes."
        actions={
          <Link
            className="button button-primary"
            to={defaultSeries ? `/series/${defaultSeries.id}` : '/projects'}
          >
            <PlayCircle size={17} />
            Open production board
          </Link>
        }
      />

      <section className="metric-grid" aria-label="Studio metrics">
        <Metric
          icon={<Film size={16} />}
          label="Active episodes"
          value={String(activeEpisodes.length)}
          detail={`${published.length} published`}
        />
        <Metric
          icon={<Clock3 size={16} />}
          label="Production time"
          value={formatDuration(totalMinutes)}
          detail="Across all episodes"
        />
        <Metric
          icon={<Coins size={16} />}
          label="Production cost"
          value={formatCurrency(totalCost)}
          detail={
            published.length
              ? `${formatCurrency(Math.round(totalCost / published.length))} / published`
              : 'No published baseline yet'
          }
        />
        <Metric
          icon={<Sparkles size={16} />}
          label="Media stored"
          value={formatBytes(storage)}
          detail={`${storagePercent.toFixed(1)}% of 9 GB safety cap`}
        />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="panel panel-pad min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">In production</div>
              <h2 className="section-title mt-1">Recent episodes</h2>
            </div>
            <Link
              className="button button-ghost"
              to={defaultSeries ? `/series/${defaultSeries.id}` : '/projects'}
            >
              View all <ArrowRight size={15} />
            </Link>
          </div>
          {recentEpisodes.length ? (
            <div className="stack-list">
              {recentEpisodes.map((episode) => {
                const totals = getEpisodeTotals(data, episode.id);
                const series = data.series.find((item) => item.id === episode.seriesId);
                return (
                  <Link
                    key={episode.id}
                    to={`/episodes/${episode.id}`}
                    className="list-row no-underline"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-black/10 text-xs font-bold text-[var(--violet-strong)]">
                        {String(episode.number).padStart(2, '0')}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--ink)]">
                          {episode.title}
                        </div>
                        <div className="muted mt-1 truncate text-xs">
                          {series?.title} · {totals.durationSeconds}s planned ·{' '}
                          {formatDuration(totals.productionMinutes)}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={episode.status} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Film />}
              title="No episodes yet"
              description="Create a series and give its first idea a production home."
            />
          )}
        </section>

        <div className="grid content-start gap-5">
          <section className="panel panel-pad">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Storage guardrail</div>
                <h2 className="section-title mt-1">Media capacity</h2>
              </div>
              <span className="badge">
                {storage >= B2_WARNING_BYTES ? 'Review storage' : 'Healthy'}
              </span>
            </div>
            <div className="mt-5 progress-track">
              <div className="progress-fill" style={{ width: `${storagePercent}%` }} />
            </div>
            <div className="muted mt-2 flex justify-between text-xs">
              <span>{formatBytes(storage)} used</span>
              <span>{formatBytes(B2_UPLOAD_BLOCK_BYTES - storage)} safe room</span>
            </div>
            <p className="quiet mt-4 text-xs leading-5">
              StudioFlow warns at 8 GB and blocks uploads at 9 GB so Backblaze’s free allowance
              keeps breathing room.
            </p>
          </section>

          <section className="panel panel-pad">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Quick captures</div>
                <h2 className="section-title mt-1">Unsorted sparks</h2>
              </div>
              <span className="badge">
                <Inbox size={13} />
                {pendingCaptures.length}
              </span>
            </div>
            {pendingCaptures.length ? (
              <div className="grid gap-2">
                {pendingCaptures.slice(0, 3).map((capture) => (
                  <div key={capture.id} className="rounded-xl border border-[var(--line)] p-3">
                    <p className="text-sm leading-5">{capture.text}</p>
                    {defaultSeries ? (
                      <Button
                        className="mt-3 w-full"
                        onClick={() => convertCaptureToEpisode(capture.id, defaultSeries.id)}
                      >
                        <Plus size={15} />
                        Turn into episode
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Lightbulb />}
                title="Inbox zero"
                description="The next quick capture will wait here until you shape it."
              />
            )}
          </section>
        </div>
      </div>

      <section className="panel panel-pad mt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Pipeline</div>
            <h2 className="section-title mt-1">Where the work is sitting</h2>
          </div>
          <span className="muted text-xs">{data.episodes.length} total episodes</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {(
            [
              'idea',
              'scripting',
              'shot_planning',
              'generating',
              'editing',
              'ready',
              'published',
            ] as const
          ).map((status) => {
            const count = data.episodes.filter((episode) => episode.status === status).length;
            return (
              <div key={status} className="rounded-xl border border-[var(--line)] bg-black/10 p-3">
                <div className="muted text-[0.68rem] font-bold uppercase tracking-wider">
                  {titleCase(status)}
                </div>
                <div className="mt-2 text-2xl font-semibold">{count}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-card">
      <div className="muted flex items-center gap-2 text-xs font-semibold">
        {icon}
        {label}
      </div>
      <div className="metric-value">{value}</div>
      <div className="quiet mt-1 text-[0.68rem]">{detail}</div>
    </div>
  );
}
