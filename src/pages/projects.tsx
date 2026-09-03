import { useState, type FormEvent } from 'react';
import { Archive, ArrowRight, FolderKanban, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudio } from '../state/studio-store';
import { Button, EmptyState, Field, Modal, PageHeading, SubmitButton } from '../components/ui';

export function ProjectsPage() {
  const { data, createProject, archiveProject } = useStudio();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const active = data.projects.filter((project) => !project.archivedAt);
  const archived = data.projects.filter((project) => project.archivedAt);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    createProject({ title: title.trim(), description: description.trim(), accent: '#b894f6' });
    setTitle('');
    setDescription('');
    setOpen(false);
  };

  return (
    <div>
      <PageHeading
        eyebrow="Projects"
        title="Your production worlds."
        description="A project contains its series, recurring production memory, and media library."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            New project
          </Button>
        }
      />
      {active.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((project) => {
            const series = data.series.filter(
              (item) => item.projectId === project.id && !item.archivedAt
            );
            const seriesIds = new Set(series.map((item) => item.id));
            const episodes = data.episodes.filter((episode) => seriesIds.has(episode.seriesId));
            return (
              <article key={project.id} className="panel overflow-hidden">
                <div
                  className="h-1"
                  style={{ background: `linear-gradient(90deg, ${project.accent}, transparent)` }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="grid h-11 w-11 place-items-center rounded-xl"
                      style={{ background: `${project.accent}1f`, color: project.accent }}
                    >
                      <FolderKanban size={20} />
                    </div>
                    <Button variant="ghost" onClick={() => archiveProject(project.id)}>
                      <Archive size={15} />
                      Archive
                    </Button>
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-tight">{project.title}</h2>
                  <p className="muted mt-2 min-h-10 text-sm leading-5">
                    {project.description || 'No description yet.'}
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    <span className="badge">{series.length} series</span>
                    <span className="badge">{episodes.length} episodes</span>
                  </div>
                  <Link className="button mt-5 w-full" to={`/projects/${project.id}`}>
                    Open project <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            icon={<FolderKanban size={28} />}
            title="Create your first project"
            description="Start with one creative universe or production business, then add one or more series."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                <Plus size={16} />
                New project
              </Button>
            }
          />
        </section>
      )}

      {archived.length ? (
        <section className="mt-7">
          <h2 className="section-title mb-3">Archived</h2>
          <div className="stack-list">
            {archived.map((project) => (
              <div className="list-row opacity-65" key={project.id}>
                <span>{project.title}</span>
                <span className="badge">Archived</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create project"
        description="A project is the top-level home for a creative universe or campaign."
      >
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Project title">
            <input
              autoFocus
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Everyday Absurdity Studio"
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What belongs in this studio?"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>Create project</SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
