import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, CircleDollarSign, Clock3, CopyPlus, ExternalLink, FileText, Film, Image, Layers3, Plus, Save, Send, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { GenerationHistoryPanel } from "../components/generation-history-panel";
import { MediaPreview } from "../components/media-preview";
import { PromptHistoryPanel } from "../components/prompt-history-panel";
import { StatusBadge } from "../components/status";
import { Button, EmptyState, Field, Modal, PageHeading, SubmitButton } from "../components/ui";
import { getEpisodeTotals } from "../lib/domain";
import { formatCurrency, formatDuration, formatShortDate, titleCase } from "../lib/format";
import { episodeStatuses, useStudio } from "../state/studio-store";
import type { BeatType, CostCategory, Platform, Shot } from "../types";

type Tab = "overview" | "script" | "shots" | "media" | "prompts" | "costs" | "publish";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" }, { id: "script", label: "Script" }, { id: "shots", label: "Scenes & shots" },
  { id: "media", label: "Media" }, { id: "prompts", label: "Prompts & generations" }, { id: "costs", label: "Time & cost" }, { id: "publish", label: "Publish" },
];

export function EpisodePage() {
  const { episodeId } = useParams();
  const studio = useStudio();
  const { data } = studio;
  const episode = data.episodes.find((item) => item.id === episodeId);
  const [tab, setTab] = useState<Tab>("overview");
  if (!episode) return <section className="panel"><EmptyState icon={<Film />} title="Episode not found" description="Return to the production board and choose an active episode." action={<Link className="button" to="/projects">Go to projects</Link>} /></section>;
  const series = data.series.find((item) => item.id === episode.seriesId);
  const totals = getEpisodeTotals(data, episode.id);
  const shotProgress = episode.targetDurationSeconds ? Math.min(100, totals.durationSeconds / episode.targetDurationSeconds * 100) : 0;

  return (
    <div>
      <Link className="button button-ghost mb-4" to={series ? `/series/${series.id}` : "/projects"}><ArrowLeft size={16} />{series?.title ?? "Series"}</Link>
      <PageHeading eyebrow={`Episode ${String(episode.number).padStart(2, "0")}`} title={episode.title} description={episode.idea} actions={<StatusBadge status={episode.status} />} />
      <section className="panel mb-4 p-3"><div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"><div><div className="mb-2 flex justify-between text-xs"><span className="muted">Planned shot duration</span><span>{totals.durationSeconds}s / {episode.targetDurationSeconds}s</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${shotProgress}%` }} /></div></div><div className="rounded-xl border border-[var(--line)] px-3 py-2"><div className="quiet text-[0.65rem] uppercase tracking-wider">Time</div><div className="mt-1 text-sm font-semibold">{formatDuration(totals.productionMinutes)}</div></div><div className="rounded-xl border border-[var(--line)] px-3 py-2"><div className="quiet text-[0.65rem] uppercase tracking-wider">Cost</div><div className="mt-1 text-sm font-semibold">{formatCurrency(totals.costCents)}</div></div></div></section>
      <div className="tabs mb-4" role="tablist" aria-label="Episode workspace">{tabs.map((item) => <button key={item.id} className="tab" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
      {tab === "overview" ? <OverviewTab key={`overview-${episode.id}`} episodeId={episode.id} /> : null}
      {tab === "script" ? <ScriptTab key={`script-${episode.id}`} episodeId={episode.id} /> : null}
      {tab === "shots" ? <ShotsTab key={`shots-${episode.id}`} episodeId={episode.id} /> : null}
      {tab === "media" ? <EpisodeMediaTab key={`media-${episode.id}`} episodeId={episode.id} /> : null}
      {tab === "prompts" ? <PromptsTab key={`prompts-${episode.id}`} episodeId={episode.id} /> : null}
      {tab === "costs" ? <CostsTab key={`costs-${episode.id}`} episodeId={episode.id} /> : null}
      {tab === "publish" ? <PublishTab key={`publish-${episode.id}`} episodeId={episode.id} /> : null}
    </div>
  );
}

function OverviewTab({ episodeId }: { episodeId: string }) {
  const { data, updateEpisode, episodeDrafts, patchEpisodeDraft } = useStudio();
  const episode = data.episodes.find((item) => item.id === episodeId)!;
  const draft = episodeDrafts[episodeId];
  const [title, setTitle] = useState(draft?.title ?? episode.title);
  const [idea, setIdea] = useState(draft?.idea ?? episode.idea);
  const [tags, setTags] = useState(draft?.tags ?? episode.tags.join(", "));

  useEffect(() => {
    const handle = window.setTimeout(() => {
      patchEpisodeDraft(episodeId, {
        title: title.trim(),
        idea: idea.trim(),
        tags,
      });
    }, 450);
    return () => window.clearTimeout(handle);
  }, [episodeId, idea, tags, title, patchEpisodeDraft]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sanitizedTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    updateEpisode(episodeId, { title: title.trim(), idea: idea.trim(), tags: sanitizedTags });
    patchEpisodeDraft(episodeId, { title: title.trim(), idea: idea.trim(), tags: sanitizedTags.join(", ") });
  };

  return <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><section className="panel panel-pad"><div className="eyebrow">Episode brief</div><h2 className="section-title mt-1">Working definition</h2><form className="mt-5 grid gap-4" onSubmit={save}><Field label="Working title"><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></Field><Field label="Core idea"><textarea className="textarea" value={idea} onChange={(event) => setIdea(event.target.value)} /></Field><Field label="Tags" hint="Separate tags with commas."><input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="technology, argument hook" /></Field><div className="flex justify-end"><Button type="submit" variant="primary"><Save size={16} />Save brief</Button></div></form></section><section className="panel panel-pad"><div className="eyebrow">Production stage</div><h2 className="section-title mt-1">Move the episode forward</h2><div className="mt-5 grid gap-2">{episodeStatuses.filter((status) => status !== "archived").map((status) => <button key={status} className={`list-row text-left ${episode.status === status ? "!border-[rgb(184_148_246_/_0.55)] !bg-[rgb(184_148_246_/_0.08)]" : ""}`} onClick={() => updateEpisode(episodeId, { status })}><span className="text-sm font-semibold">{titleCase(status)}</span>{episode.status === status ? <Check size={17} color="var(--violet)" /> : null}</button>)}</div></section></div>;
}

function ScriptTab({ episodeId }: { episodeId: string }) {
  const { data, saveScriptVersion, episodeDrafts, patchEpisodeDraft } = useStudio();
  const versions = data.scripts.filter((script) => script.episodeId === episodeId).sort((a, b) => b.version - a.version);
  const latest = versions[0];
  const savedDraft = episodeDrafts[episodeId]?.script;
  const [content, setContent] = useState(savedDraft?.trim() ? savedDraft : latest?.content ?? "");
  const [note, setNote] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!content.trim()) return; const savedContent = content.trim(); saveScriptVersion(episodeId, savedContent, note.trim()); setContent(savedContent); setNote(""); patchEpisodeDraft(episodeId, { script: savedContent }); };
  useEffect(() => {
    const handle = window.setTimeout(() => {
      patchEpisodeDraft(episodeId, { script: content });
    }, 450);
    return () => window.clearTimeout(handle);
  }, [episodeId, content, patchEpisodeDraft]);
  return <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]"><section className="panel panel-pad"><div className="flex items-center justify-between"><div><div className="eyebrow">Current draft</div><h2 className="section-title mt-1">Script editor</h2></div><span className="badge">Next: v{(latest?.version ?? 0) + 1}</span></div><form className="mt-4 grid gap-3" onSubmit={submit}><Field label="Script"><textarea className="textarea min-h-[420px] font-mono !text-sm" value={content} onChange={(event) => setContent(event.target.value)} placeholder="MAYA: No, fridge…" /></Field><Field label="Version note"><input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed in this version?" /></Field><div className="flex justify-end"><Button type="submit" variant="primary"><CopyPlus size={16} />Save immutable version</Button></div></form></section><section className="panel panel-pad"><div className="eyebrow">History</div><h2 className="section-title mt-1">Script versions</h2>{versions.length ? <div className="mt-4 grid gap-2">{versions.map((version) => <button key={version.version + version.id} onClick={() => { setContent(version.content); patchEpisodeDraft(episodeId, { script: version.content }); }} className="rounded-xl border border-[var(--line)] bg-black/10 p-3 text-left hover:border-[var(--line-strong)]"><div className="flex justify-between gap-2"><strong className="text-sm">Version {version.version}</strong><span className="quiet text-[0.65rem]">{formatShortDate(version.createdAt)}</span></div><p className="muted mt-2 text-xs leading-5">{version.note || "No version note."}</p></button>)}</div> : <EmptyState icon={<FileText />} title="No script versions" description="Write the first draft and preserve it as version one." />}</section></div>;
}

function ShotsTab({ episodeId }: { episodeId: string }) {
  const { data, addScene, addSitcomTemplate, addShot, updateScene, updateShot, moveScene, moveShot } = useStudio();
  const scenes = data.scenes.filter((scene) => scene.episodeId === episodeId).sort((a, b) => a.position - b.position);
  const [shotEdit, setShotEdit] = useState<Shot | null>(null);
  const [beat, setBeat] = useState<BeatType>("custom");
  const addNewScene = () => addScene(episodeId, beat);
  const saveShot = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!shotEdit) return; updateShot(shotEdit.id, shotEdit); setShotEdit(null); };
  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <select className="select !w-auto" value={beat} onChange={(event) => setBeat(event.target.value as BeatType)}>
            {(["hook", "setup", "escalation", "payoff", "tag", "custom"] as const).map((item) => (
              <option key={item} value={item}>
                {titleCase(item)}
              </option>
            ))}
          </select>
          <Button onClick={addNewScene}>
            <Plus size={16} />Add scene
          </Button>
        </div>
        {!scenes.length ? (
          <Button variant="primary" onClick={() => addSitcomTemplate(episodeId)}>
            <Sparkles size={16} />Add sitcom template
          </Button>
        ) : null}
      </div>
      {scenes.length ? (
        <div className="grid gap-3">
          {scenes.map((scene, sceneIndex) => {
            const shots = data.shots.filter((shot) => shot.sceneId === scene.id).sort((a, b) => a.position - b.position);
            const canMoveSceneUp = sceneIndex > 0;
            const canMoveSceneDown = sceneIndex < scenes.length - 1;
            return (
              <section key={scene.id} className="panel overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgb(184_148_246_/_0.12)] text-sm font-bold text-[var(--violet-strong)]">
                      {sceneIndex + 1}
                    </div>
                    <div className="min-w-0">
                      <input
                        className="w-full border-0 bg-transparent text-sm font-semibold outline-none"
                        value={scene.title}
                        onChange={(event) => updateScene(scene.id, { title: event.target.value })}
                      />
                      <div className="muted mt-1 text-xs">
                        {titleCase(scene.beat)} · {shots.reduce((sum, shot) => sum + shot.durationSeconds, 0)} seconds
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" disabled={!canMoveSceneUp} onClick={() => moveScene(scene.id, "up")}>
                      <ChevronUp size={15} />
                    </Button>
                    <Button variant="ghost" disabled={!canMoveSceneDown} onClick={() => moveScene(scene.id, "down")}>
                      <ChevronDown size={15} />
                    </Button>
                    <Button onClick={() => addShot(scene.id)}>
                      <Plus size={15} />Add shot
                    </Button>
                  </div>
                </header>
                <div className="grid gap-2 p-3">
                  {shots.length ? (
                    shots.map((shot, shotIndex) => {
                      const canMoveShotUp = shotIndex > 0;
                      const canMoveShotDown = shotIndex < shots.length - 1;
                      return (
                          <div
                            key={shot.id}
                            className="list-row text-left"
                            role="button"
                            tabIndex={0}
                            onClick={() => setShotEdit(structuredClone(shot))}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setShotEdit(structuredClone(shot));
                              }
                            }}
                          >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="quiet text-xs font-bold">
                              {sceneIndex + 1}.{shotIndex + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{shot.title}</div>
                              <div className="muted mt-1 truncate text-xs">{shot.framing} · {shot.action || "No action written"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="h-9 w-9 rounded-lg border border-[var(--line)] disabled:opacity-45"
                              disabled={!canMoveShotUp}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveShot(shot.id, "up");
                              }}
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              type="button"
                              className="h-9 w-9 rounded-lg border border-[var(--line)] disabled:opacity-45"
                              disabled={!canMoveShotDown}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveShot(shot.id, "down");
                              }}
                            >
                              <ChevronDown size={15} />
                            </button>
                            <span className="badge">{shot.durationSeconds}s</span>
                            <span className="badge">{titleCase(shot.status)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state !py-5">
                      <p className="muted text-sm">No shots in this scene yet.</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            icon={<Layers3 size={28} />}
            title="Build the episode structure"
            description="Use the sitcom template for Hook → Setup → Escalation → Payoff → Tag, or add custom scenes individually."
            action={
              <Button variant="primary" onClick={() => addSitcomTemplate(episodeId)}>
                <Sparkles size={16} />Add sitcom template
              </Button>
            }
          />
        </section>
      )}
      <Modal
        open={Boolean(shotEdit)}
        onClose={() => setShotEdit(null)}
        title={shotEdit?.title ?? "Edit shot"}
        description="Shot details become the source for prompts, generations, and the future timeline editor."
      >
        {shotEdit ? (
          <form className="grid gap-4" onSubmit={saveShot}>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <Field label="Shot title">
                <input className="input" value={shotEdit.title} onChange={(event) => setShotEdit({ ...shotEdit, title: event.target.value })} />
              </Field>
              <Field label="Duration">
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="120"
                  value={shotEdit.durationSeconds}
                  onChange={(event) => setShotEdit({ ...shotEdit, durationSeconds: Number(event.target.value) })}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Framing">
                <input className="input" value={shotEdit.framing} onChange={(event) => setShotEdit({ ...shotEdit, framing: event.target.value })} />
              </Field>
              <Field label="Status">
                <select
                  className="select"
                  value={shotEdit.status}
                  onChange={(event) => setShotEdit({ ...shotEdit, status: event.target.value as Shot["status"] })}
                >
                  <option value="planned">Planned</option>
                  <option value="generated">Generated</option>
                  <option value="selected">Selected</option>
                </select>
              </Field>
            </div>
            <Field label="Action">
              <textarea className="textarea" value={shotEdit.action} onChange={(event) => setShotEdit({ ...shotEdit, action: event.target.value })} />
            </Field>
            <Field label="Dialogue">
              <textarea className="textarea" value={shotEdit.dialogue} onChange={(event) => setShotEdit({ ...shotEdit, dialogue: event.target.value })} />
            </Field>
            <Field label="Working prompt">
              <textarea className="textarea" value={shotEdit.prompt} onChange={(event) => setShotEdit({ ...shotEdit, prompt: event.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setShotEdit(null)}>
                Cancel
              </Button>
              <SubmitButton>Save shot</SubmitButton>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function EpisodeMediaTab({ episodeId }: { episodeId: string }) {
  const { data, setAssetReview } = useStudio();
  const assets = data.assets.filter((asset) => asset.episodeId === episodeId && !asset.deletedAt);
  return assets.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{assets.map((asset) => <article key={asset.id} className="panel p-3"><MediaPreview asset={asset} controls /><div className="mt-3 truncate text-sm font-semibold">{asset.filename}</div><div className="muted mt-1 text-xs">{titleCase(asset.kind)} · {titleCase(asset.reviewStatus)}</div><div className="mt-3 grid grid-cols-3 gap-2"><Button onClick={() => setAssetReview(asset.id, "selected")}><Check size={14} />Select</Button><Button onClick={() => setAssetReview(asset.id, "unreviewed")}>Reset</Button><Button onClick={() => setAssetReview(asset.id, "rejected")}>Reject</Button></div></article>)}</div> : <section className="panel"><EmptyState icon={<Image size={28} />} title="No media linked to this episode" description="Upload from the Media library and choose this episode, or add generated results later." action={<Link className="button button-primary" to="/media">Open media library</Link>} /></section>;
}

function PromptsTab({ episodeId }: { episodeId: string }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <PromptHistoryPanel episodeId={episodeId} />
      <GenerationHistoryPanel episodeId={episodeId} />
    </div>
  );
}

function CostsTab({ episodeId }: { episodeId: string }) {
  const { data, addTimeEntry, addCostEntry } = useStudio();
  const times = data.timeEntries.filter((entry) => entry.episodeId === episodeId);
  const costs = data.costEntries.filter((entry) => entry.episodeId === episodeId);
  const [minutes, setMinutes] = useState(""); const [timeCategory, setTimeCategory] = useState<"script" | "storyboard" | "generation" | "editing" | "publishing" | "idea" | "other">("script"); const [timeNote, setTimeNote] = useState("");
  const [amount, setAmount] = useState(""); const [costCategory, setCostCategory] = useState<CostCategory>("video"); const [provider, setProvider] = useState(""); const [costNote, setCostNote] = useState("");
  const submitTime = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); addTimeEntry(episodeId, Number(minutes), timeCategory, timeNote); setMinutes(""); setTimeNote(""); };
  const submitCost = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); addCostEntry(episodeId, Math.round(Number(amount) * 100), costCategory, provider, costNote); setAmount(""); setProvider(""); setCostNote(""); };
  return <div className="grid gap-4 xl:grid-cols-2"><section className="panel panel-pad"><div className="flex items-center gap-2"><Clock3 size={17} color="var(--violet)" /><h2 className="section-title">Production time</h2></div><form className="mt-4 grid gap-3" onSubmit={submitTime}><div className="grid grid-cols-[120px_1fr] gap-3"><Field label="Minutes"><input className="input" type="number" min="1" required value={minutes} onChange={(event) => setMinutes(event.target.value)} /></Field><Field label="Category"><select className="select" value={timeCategory} onChange={(event) => setTimeCategory(event.target.value as typeof timeCategory)}>{["idea", "script", "storyboard", "generation", "editing", "publishing", "other"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select></Field></div><Field label="Note"><input className="input" value={timeNote} onChange={(event) => setTimeNote(event.target.value)} /></Field><Button type="submit"><Plus size={15} />Add time</Button></form><div className="mt-4 grid gap-2">{times.map((entry) => <div className="list-row" key={entry.id}><div><div className="text-sm font-semibold">{titleCase(entry.category)}</div><div className="muted mt-1 text-xs">{entry.note}</div></div><span className="badge">{entry.minutes}m</span></div>)}</div></section><section className="panel panel-pad"><div className="flex items-center gap-2"><CircleDollarSign size={17} color="var(--mint)" /><h2 className="section-title">Production cost</h2></div><form className="mt-4 grid gap-3" onSubmit={submitCost}><div className="grid grid-cols-[120px_1fr] gap-3"><Field label="USD"><input className="input" type="number" min="0" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><Field label="Category"><select className="select" value={costCategory} onChange={(event) => setCostCategory(event.target.value as CostCategory)}>{["image", "video", "voice", "music", "editing", "other"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select></Field></div><Field label="Provider"><input className="input" value={provider} onChange={(event) => setProvider(event.target.value)} /></Field><Field label="Note"><input className="input" value={costNote} onChange={(event) => setCostNote(event.target.value)} /></Field><Button type="submit"><Plus size={15} />Add cost</Button></form><div className="mt-4 grid gap-2">{costs.map((entry) => <div className="list-row" key={entry.id}><div><div className="text-sm font-semibold">{entry.provider || titleCase(entry.category)}</div><div className="muted mt-1 text-xs">{entry.note}</div></div><span className="badge">{formatCurrency(entry.amountCents)}</span></div>)}</div></section></div>;
}

function PublishTab({ episodeId }: { episodeId: string }) {
  const { data, addPublication, updateEpisode } = useStudio();
  const publications = data.publications.filter((publication) => publication.episodeId === episodeId);
  const [platform, setPlatform] = useState<Platform>("tiktok"); const [url, setUrl] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); addPublication(episodeId, platform, url.trim()); updateEpisode(episodeId, { status: "published" }); setUrl(""); };
  return <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]"><section className="panel panel-pad"><div className="eyebrow">Publication record</div><h2 className="section-title mt-1">Add a platform link</h2><p className="muted mt-2 text-sm leading-5">StudioFlow records where the episode went. Automatic posting and performance imports come later.</p><form className="mt-4 grid gap-3" onSubmit={submit}><Field label="Platform"><select className="select" value={platform} onChange={(event) => setPlatform(event.target.value as Platform)}><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></Field><Field label="Published URL"><input className="input" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></Field><Button type="submit" variant="primary"><Send size={16} />Record publication</Button></form></section><section className="panel panel-pad"><div className="eyebrow">Distribution</div><h2 className="section-title mt-1">Published versions</h2>{publications.length ? <div className="mt-4 grid gap-2">{publications.map((publication) => <a key={publication.id} href={publication.url} target="_blank" rel="noreferrer" className="list-row no-underline"><div><div className="text-sm font-semibold text-[var(--ink)]">{titleCase(publication.platform)}</div><div className="muted mt-1 text-xs">{formatShortDate(publication.publishedAt)}</div></div><ExternalLink size={16} color="var(--violet)" /></a>)}</div> : <EmptyState icon={<Send />} title="Not published yet" description="When an episode goes live, record each platform version here." />}</section></div>;
}
