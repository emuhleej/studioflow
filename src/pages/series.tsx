import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Film, Plus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, EmptyState, Field, Modal, PageHeading, SubmitButton } from "../components/ui";
import { StatusBadge } from "../components/status";
import { getEpisodeTotals } from "../lib/domain";
import { formatCurrency, formatDuration } from "../lib/format";
import { useStudio } from "../state/studio-store";

export function SeriesPage() {
  const { seriesId } = useParams();
  const navigate = useNavigate();
  const { data, createEpisode } = useStudio();
  const series = data.series.find((item) => item.id === seriesId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const episodes = data.episodes.filter((episode) => episode.seriesId === seriesId).sort((a, b) => a.number - b.number);
  const project = data.projects.find((item) => item.id === series?.projectId);

  if (!series) return <section className="panel"><EmptyState icon={<Film />} title="Series not found" description="Return to Projects and choose an active series." action={<Link className="button" to="/projects">Go to projects</Link>} /></section>;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const episode = createEpisode(series.id, title.trim(), idea.trim());
    setOpen(false);
    navigate(`/episodes/${episode.id}`);
  };

  return (
    <div>
      <Link className="button button-ghost mb-4" to={`/projects/${series.projectId}`}><ArrowLeft size={16} />{project?.title ?? "Project"}</Link>
      <PageHeading eyebrow={`${series.orientation} · ${series.targetDurationSeconds}s template`} title={series.title} description={series.premise} actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={16} />New episode</Button>} />
      {episodes.length ? <section className="panel panel-pad"><div className="mb-4 flex items-center justify-between"><div><div className="eyebrow">Episode board</div><h2 className="section-title mt-1">Production pipeline</h2></div><span className="badge">{episodes.length} episodes</span></div><div className="stack-list">{episodes.map((episode) => {
        const totals = getEpisodeTotals(data, episode.id);
        return <Link key={episode.id} className="list-row no-underline" to={`/episodes/${episode.id}`}><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-black/10 text-xs font-bold text-[var(--violet-strong)]">E{String(episode.number).padStart(2, "0")}</div><div className="min-w-0"><div className="truncate text-sm font-semibold text-[var(--ink)]">{episode.title}</div><div className="muted mt-1 truncate text-xs">{episode.idea}</div><div className="quiet mt-1 text-[0.68rem]">{totals.durationSeconds}s planned · {formatDuration(totals.productionMinutes)} · {formatCurrency(totals.costCents)}</div></div></div><div className="flex items-center gap-3"><StatusBadge status={episode.status} /><ArrowRight size={16} color="var(--violet)" /></div></Link>;
      })}</div></section> : <section className="panel"><EmptyState icon={<Film size={28} />} title="Give the series its pilot" description="Start with one idea. StudioFlow will hold its script, scenes, shots, generations, media, time, and cost." action={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={16} />Create episode</Button>} /></section>}
      <Modal open={open} onClose={() => setOpen(false)} title="Create episode" description={`Episode ${episodes.length + 1} will start in the Idea stage.`}><form className="grid gap-4" onSubmit={submit}><Field label="Working title"><input autoFocus className="input" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="The Refrigerator Takes Sides" /></Field><Field label="Core idea"><textarea className="textarea" value={idea} onChange={(event) => setIdea(event.target.value)} required placeholder="One sentence that contains the conflict or comic turn." /></Field><div className="flex justify-end gap-2"><Button type="button" onClick={() => setOpen(false)}>Cancel</Button><SubmitButton>Create episode</SubmitButton></div></form></Modal>
    </div>
  );
}
