import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Clapperboard, Plus, Shapes } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Field, Modal, PageHeading, SubmitButton } from '../components/ui';
import { useStudio } from '../state/studio-store';

export function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data, createSeries } = useStudio();
  const project = data.projects.find((item) => item.id === projectId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [premise, setPremise] = useState('');
  const series = data.series.filter((item) => item.projectId === projectId && !item.archivedAt);

  if (!project) return <NotFound label="Project" back="/projects" />;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = createSeries({
      projectId: project.id,
      title: title.trim(),
      premise: premise.trim(),
      format: 'short_series',
      orientation: '9:16',
      targetDurationSeconds: 75,
    });
    setOpen(false);
    navigate(`/series/${created.id}`);
  };

  const entityCount = data.entities.filter((entity) => entity.projectId === project.id).length;
  const assetCount = data.assets.filter((asset) => asset.projectId === project.id).length;

  return (
    <div>
      <Link className="button button-ghost mb-4" to="/projects">
        <ArrowLeft size={16} />
        All projects
      </Link>
      <PageHeading
        eyebrow="Project"
        title={project.title}
        description={project.description}
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={16} />
            New series
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Series" value={series.length} />
        <MiniMetric label="Memory records" value={entityCount} />
        <MiniMetric label="Media assets" value={assetCount} />
      </div>
      <section className="panel panel-pad">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="eyebrow">Series</div>
            <h2 className="section-title mt-1">Active productions</h2>
          </div>
        </div>
        {series.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {series.map((item) => {
              const episodes = data.episodes.filter((episode) => episode.seriesId === item.id);
              return (
                <Link
                  key={item.id}
                  to={`/series/${item.id}`}
                  className="rounded-2xl border border-[var(--line)] bg-black/10 p-4 no-underline transition hover:border-[var(--line-strong)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgb(184_148_246_/_0.12)] text-[var(--violet-strong)]">
                      <Clapperboard size={19} />
                    </div>
                    <span className="badge">
                      {item.orientation} · {item.targetDurationSeconds}s
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--ink)]">{item.title}</h3>
                  <p className="muted mt-2 text-sm leading-5">{item.premise}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="quiet text-xs">{episodes.length} episodes</span>
                    <ArrowRight size={16} color="var(--violet)" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Shapes />}
            title="No series yet"
            description="Create the recurring format that will turn ideas into a recognizable content library."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                <Plus size={16} />
                Create series
              </Button>
            }
          />
        )}
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create series"
        description="Version one starts with the reusable 60–90 second vertical series template."
      >
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Series title">
            <input
              autoFocus
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>
          <Field label="Premise">
            <textarea
              className="textarea"
              value={premise}
              onChange={(event) => setPremise(event.target.value)}
              placeholder="What repeats, and why will people return?"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Format">
              <input className="input" value="Short series" disabled />
            </Field>
            <Field label="Default">
              <input className="input" value="9:16 · 75 seconds" disabled />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>Create series</SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <div className="muted text-xs font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function NotFound({ label, back }: { label: string; back: string }) {
  return (
    <section className="panel">
      <EmptyState
        icon={<Clapperboard />}
        title={`${label} not found`}
        description="It may have been archived or removed from this workspace."
        action={
          <Link className="button" to={back}>
            <ArrowLeft size={16} />
            Go back
          </Link>
        }
      />
    </section>
  );
}
