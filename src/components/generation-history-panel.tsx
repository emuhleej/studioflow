import { useMemo, useState, type FormEvent } from "react";
import { Ban, Check, FileAudio, FileImage, FileVideo, Link2, LoaderCircle, Plus, RotateCcw, Sparkles, Unlink, X } from "lucide-react";
import { formatCurrency, formatShortDate, titleCase } from "../lib/format";
import {
  getEligibleGenerationAssets,
  getEpisodeGenerationHistory,
  getGenerationResultAssets,
  getPromptVersionLabel,
  validateGenerationInput,
  type GenerationInput,
} from "../lib/generation-history";
import { getEpisodePromptHistory } from "../lib/prompt-history";
import { useStudio } from "../state/studio-store";
import type { Asset, AssetReviewStatus, GenerationMediaKind, GenerationOperationalStatus } from "../types";
import { Button, EmptyState, Field, Modal, SubmitButton } from "./ui";

export function GenerationHistoryPanel({ episodeId }: { episodeId: string }) {
  const {
    data,
    isDemo,
    addGeneration,
    simulateGeneration,
    cancelManagedGeneration,
    resolveUnknownSubmission,
    linkGenerationAsset,
    unlinkGenerationAsset,
    setGenerationOutcome,
  } = useStudio();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [promptVersionId, setPromptVersionId] = useState("");
  const [shotId, setShotId] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [manageGenerationId, setManageGenerationId] = useState("");
  const [resultAssetId, setResultAssetId] = useState("");
  const [resultError, setResultError] = useState("");
  const [simulationKind, setSimulationKind] = useState<GenerationMediaKind>("image");
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simulationPromptId, setSimulationPromptId] = useState("");
  const [simulationReferenceId, setSimulationReferenceId] = useState("");
  const [simulationBusy, setSimulationBusy] = useState(false);
  const [simulationError, setSimulationError] = useState("");

  const scenes = useMemo(
    () => data.scenes.filter((scene) => scene.episodeId === episodeId).sort((left, right) => left.position - right.position),
    [data.scenes, episodeId],
  );
  const scenePositions = useMemo(() => new Map(scenes.map((scene, index) => [scene.id, index])), [scenes]);
  const shots = useMemo(
    () => data.shots
      .filter((shot) => scenePositions.has(shot.sceneId))
      .sort((left, right) => (scenePositions.get(left.sceneId) ?? 0) - (scenePositions.get(right.sceneId) ?? 0) || left.position - right.position),
    [data.shots, scenePositions],
  );
  const shotsById = useMemo(() => new Map(shots.map((shot) => [shot.id, shot])), [shots]);
  const prompts = useMemo(() => getEpisodePromptHistory(data.prompts, episodeId), [data.prompts, episodeId]);
  const promptsById = useMemo(() => new Map(prompts.map((prompt) => [prompt.id, prompt])), [prompts]);
  const generations = useMemo(() => getEpisodeGenerationHistory(data.generations, episodeId), [data.generations, episodeId]);
  const selectedPrompt = promptVersionId ? promptsById.get(promptVersionId) : undefined;
  const managedGeneration = generations.find((generation) => generation.id === manageGenerationId);
  const managedResults = managedGeneration ? getGenerationResultAssets(data, managedGeneration.id) : [];
  const managedResultIds = new Set(managedResults.map((asset) => asset.id));
  const availableResults = managedGeneration
    ? getEligibleGenerationAssets(data, managedGeneration.id).filter((asset) => !managedResultIds.has(asset.id))
    : [];
  const effectiveResultAssetId = availableResults.some((asset) => asset.id === resultAssetId)
    ? resultAssetId
    : availableResults[0]?.id ?? "";
  const projectId = data.series.find((series) => series.id === data.episodes.find((episode) => episode.id === episodeId)?.seriesId)?.projectId;
  const simulationReferences = data.assets.filter((asset) => asset.projectId === projectId && asset.kind === "image" && !asset.deletedAt);
  const effectiveSimulationPromptId = prompts.some((prompt) => prompt.id === simulationPromptId)
    ? simulationPromptId
    : prompts[0]?.id ?? "";
  const effectiveSimulationReferenceId = simulationKind === "image" && simulationReferenceId === ""
    ? ""
    : simulationReferences.some((asset) => asset.id === simulationReferenceId)
      ? simulationReferenceId
      : simulationReferences[0]?.id ?? "";

  const reset = () => {
    setProvider("");
    setModel("");
    setPromptVersionId("");
    setShotId("");
    setCost("");
    setDuration("");
    setNotes("");
    setError("");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: GenerationInput = {
      episodeId,
      shotId: shotId || undefined,
      promptVersionId: promptVersionId || undefined,
      provider,
      model,
      costCents: Math.round(Number(cost || 0) * 100),
      durationSeconds: duration ? Number(duration) : undefined,
      notes,
    };
    const validationError = validateGenerationInput(data, input);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const generation = addGeneration(input);
      close();
      setMessage(`Saved generation from ${generation.provider} · ${generation.model}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation record could not be saved.");
    }
  };

  const openResults = (generationId: string) => {
    setManageGenerationId(generationId);
    setResultAssetId("");
    setResultError("");
  };

  const closeResults = () => {
    setManageGenerationId("");
    setResultAssetId("");
    setResultError("");
  };

  const attachResult = () => {
    if (!managedGeneration || !effectiveResultAssetId) return;
    try {
      const asset = data.assets.find((item) => item.id === effectiveResultAssetId);
      linkGenerationAsset(managedGeneration.id, effectiveResultAssetId);
      setResultAssetId("");
      setResultError("");
      setMessage(`Attached ${asset?.filename ?? "media"} to ${managedGeneration.provider} · ${managedGeneration.model}.`);
    } catch (caught) {
      setResultError(caught instanceof Error ? caught.message : "The result could not be attached.");
    }
  };

  const detachResult = async (asset: Asset) => {
    if (!managedGeneration) return;
    setResultError("");
    try {
      await unlinkGenerationAsset(managedGeneration.id, asset.id);
      setMessage(`Removed ${asset.filename} from this generation record.`);
    } catch (caught) {
      setResultError(caught instanceof Error ? caught.message : "The result link could not be removed.");
    }
  };

  const decide = (generationId: string, outcome: AssetReviewStatus) => {
    try {
      setGenerationOutcome(generationId, outcome);
      setMessage(`Generation marked ${outcome}.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The review decision could not be saved.");
    }
  };

  const runSimulation = async () => {
    const prompt = promptsById.get(effectiveSimulationPromptId);
    if (!prompt) {
      setSimulationError("Save a prompt version before running the simulation.");
      return;
    }
    if (simulationKind === "video" && !effectiveSimulationReferenceId) {
      setSimulationError("Choose a starting image for the video simulation.");
      return;
    }
    setSimulationBusy(true);
    setSimulationError("");
    try {
      await simulateGeneration({
        episodeId,
        shotId: prompt.shotId,
        promptVersionId: prompt.id,
        mediaKind: simulationKind,
        model: simulationKind === "image" ? "fake-image-v1" : "fake-video-v1",
        settings: {
          aspectRatio: "9:16",
          qualityTier: "draft",
          durationSeconds: simulationKind === "video" ? 5 : undefined,
          outputCount: 1,
        },
        references: effectiveSimulationReferenceId
          ? [{ assetId: effectiveSimulationReferenceId, role: simulationKind === "video" ? "start_image" : "reference_image" }]
          : [],
      });
      setSimulationOpen(false);
      setMessage("Free simulation started. No AI provider or paid service was contacted.");
    } catch (caught) {
      setSimulationError(caught instanceof Error ? caught.message : "The simulation could not start.");
    } finally {
      setSimulationBusy(false);
    }
  };

  return (
    <section className="panel panel-pad">
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--violet)_36%,var(--line))] bg-[color-mix(in_srgb,var(--violet)_8%,transparent)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="eyebrow">AI orchestration preview</div>
            <h2 className="section-title mt-1">Account-free simulation</h2>
          </div>
          <span className="badge"><Ban size={13} />Real generation off</span>
        </div>
        <p className="muted mt-2 text-xs leading-5">Exercises StudioFlow’s queue, recovery, result-linking, and cost safeguards. It creates a labeled placeholder at $0.00 and sends nothing outside StudioFlow.</p>
        {isDemo
          ? <div className="mt-3"><Button variant="primary" onClick={() => { setSimulationError(""); setSimulationOpen(true); }}><Sparkles size={15} />Try free simulation</Button></div>
          : <p className="quiet mt-3 text-xs">Simulation controls stay in the fictional demo. Real-provider execution remains server-disabled.</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="mt-5"><div className="eyebrow">Generation history</div><h2 className="section-title mt-1">Provider attempts</h2></div>
        <Button onClick={() => { setMessage(""); setOpen(true); }}><Plus size={15} />Log generation</Button>
      </div>
      <p className="muted mt-2 text-xs leading-5">Record work created in another tool. StudioFlow does not call the provider.</p>
      {message ? <p role="status" className="mt-3 text-xs text-[var(--mint)]">{message}</p> : null}

      {generations.length ? (
        <div className="mt-4 grid gap-2">
          {generations.map((generation) => {
            const prompt = generation.promptVersionId ? promptsById.get(generation.promptVersionId) : undefined;
            const results = getGenerationResultAssets(data, generation.id);
            return (
              <article className="rounded-xl border border-[var(--line)] p-3" key={generation.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="text-sm">{generation.provider} · {generation.model}</strong>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {generation.executionMode === "managed" ? <StatusBadge status={generation.operationalStatus} /> : null}
                    <OutcomeBadge outcome={generation.outcome} /><span className="badge">{formatCurrency(generation.costCents)}</span>
                  </div>
                </div>
                <div className="quiet mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem]">
                  <span>{generation.shotId ? shotsById.get(generation.shotId)?.title ?? "Unknown shot" : "Episode-wide"}</span>
                  <span>{generation.durationSeconds ? `${generation.durationSeconds}s` : "Duration not recorded"}</span>
                  <span>{formatShortDate(generation.createdAt)}</span>
                </div>
                <div className="mt-2 text-xs text-[var(--ink)]">
                  {prompt ? getPromptVersionLabel(prompt, prompt.shotId ? shotsById.get(prompt.shotId)?.title : undefined) : "No prompt version attached"}
                </div>
                <p className="muted mt-2 whitespace-pre-wrap text-xs leading-5">{generation.notes || "No notes."}</p>
                {generation.executionMode === "managed" ? (
                  <div className="mt-3 rounded-xl border border-[var(--line)] bg-black/10 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold">Lifecycle</div>
                        <div className="quiet mt-1 text-[0.65rem]">Maximum reserved cost {formatMicros(generation.reservedMaxCostMicros)} · {generation.provider === "studioflow-fake" ? "No provider contacted" : "Server managed"}</div>
                      </div>
                      {["draft", "submitting", "queued", "running", "saving", "cancel_requested"].includes(generation.operationalStatus)
                        ? <Button onClick={() => void cancelManagedGeneration(generation.id)}><X size={14} />Cancel</Button>
                        : null}
                    </div>
                    <ol className="quiet mt-2 grid gap-1 text-[0.65rem]">
                      {data.generationEvents.filter((event) => event.generationId === generation.id).slice(-4).map((event) => (
                        <li key={event.id}>{formatShortDate(event.createdAt)} · {event.message}</li>
                      ))}
                    </ol>
                    {generation.operationalStatus === "submission_unknown" ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Resolve unknown submission">
                        <Button onClick={() => resolveUnknownSubmission(generation.id, "no_charge")}>Confirm no charge</Button>
                        <Button variant="danger" onClick={() => resolveUnknownSubmission(generation.id, "confirmed_charge", generation.reservedMaxCostMicros)}>Confirm reserved charge</Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 rounded-xl border border-[var(--line)] bg-black/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><div className="text-xs font-semibold">Result media</div><div className="quiet mt-1 text-[0.65rem]">{results.length ? `${results.length} attached` : "No result attached"}</div></div>
                    <Button onClick={() => openResults(generation.id)}><Link2 size={15} />Manage results</Button>
                  </div>
                  {results.length ? <div className="mt-2 flex flex-wrap gap-2">{results.map((asset) => <span className="badge max-w-full" key={asset.id}><AssetKindIcon asset={asset} /><span className="truncate">{asset.filename}</span>{asset.deletedAt ? " · In trash" : ""}</span>)}</div> : null}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label={`Review ${generation.provider} ${generation.model}`}>
                  <Button variant={generation.outcome === "selected" ? "primary" : "default"} aria-label={`Select ${generation.provider} ${generation.model}`} onClick={() => decide(generation.id, "selected")}><Check size={14} />Select</Button>
                  <Button aria-label={`Reset ${generation.provider} ${generation.model} review`} onClick={() => decide(generation.id, "unreviewed")}><RotateCcw size={14} />Reset</Button>
                  <Button variant={generation.outcome === "rejected" ? "danger" : "default"} aria-label={`Reject ${generation.provider} ${generation.model}`} onClick={() => decide(generation.id, "rejected")}><X size={14} />Reject</Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <EmptyState icon={<Sparkles />} title="No generations logged" description="Record the first external provider attempt for this episode." />}

      <Modal
        open={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        title="Account-free simulation"
        description="Exercises the managed lifecycle with a fictional $0.00 result. Nothing leaves StudioFlow."
      >
        <div className="grid gap-3">
          <Field label="Simulation type">
            <select className="select" value={simulationKind} onChange={(event) => setSimulationKind(event.target.value as GenerationMediaKind)}>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </Field>
          <Field label="Locked prompt version">
            <select className="select" value={effectiveSimulationPromptId} onChange={(event) => setSimulationPromptId(event.target.value)} disabled={!prompts.length}>
              {prompts.length
                ? prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{getPromptVersionLabel(prompt, prompt.shotId ? shotsById.get(prompt.shotId)?.title : undefined)}</option>)
                : <option value="">No prompt versions available</option>}
            </select>
          </Field>
          <Field label={simulationKind === "video" ? "Starting image" : "Optional reference image"}>
            <select className="select" value={effectiveSimulationReferenceId} onChange={(event) => setSimulationReferenceId(event.target.value)} disabled={!simulationReferences.length}>
              {simulationKind === "image" ? <option value="">No reference</option> : null}
              {simulationReferences.map((asset) => <option key={asset.id} value={asset.id}>{asset.filename}</option>)}
            </select>
          </Field>
          {simulationError ? <p role="alert" className="text-xs text-[var(--danger)]">{simulationError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setSimulationOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void runSimulation()} disabled={simulationBusy || !prompts.length || (simulationKind === "video" && !simulationReferences.length)}>
              {simulationBusy ? <LoaderCircle className="animate-spin" size={15} /> : <Sparkles size={15} />}
              {simulationBusy ? "Starting…" : "Run free simulation"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={open} onClose={close} title="Log generation" description="Save manual provenance without connecting an AI provider.">
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Provider"><input className="input" value={provider} onChange={(event) => setProvider(event.target.value)} required /></Field>
            <Field label="Model"><input className="input" value={model} onChange={(event) => setModel(event.target.value)} required /></Field>
          </div>
          <Field label="Prompt version">
            <select
              className="select"
              value={promptVersionId}
              onChange={(event) => {
                const nextId = event.target.value;
                const prompt = promptsById.get(nextId);
                setPromptVersionId(nextId);
                if (prompt?.shotId) setShotId(prompt.shotId);
              }}
            >
              <option value="">No saved prompt attached</option>
              {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{getPromptVersionLabel(prompt, prompt.shotId ? shotsById.get(prompt.shotId)?.title : undefined)}</option>)}
            </select>
          </Field>
          <Field label="Shot">
            <select className="select" value={shotId} onChange={(event) => setShotId(event.target.value)} disabled={Boolean(selectedPrompt?.shotId)}>
              <option value="">Episode-wide</option>
              {shots.map((shot) => <option key={shot.id} value={shot.id}>{shot.title}</option>)}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cost (USD)"><input className="input" type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} /></Field>
            <Field label="Duration (seconds)"><input className="input" type="number" min="0.001" max="14400" step="0.001" value={duration} onChange={(event) => setDuration(event.target.value)} /></Field>
          </div>
          <Field label="Notes"><textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          {error ? <p role="alert" className="text-xs text-[var(--danger)]">{error}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" onClick={close}>Cancel</Button><SubmitButton>Save generation</SubmitButton></div>
        </form>
      </Modal>

      <Modal
        open={Boolean(managedGeneration)}
        onClose={closeResults}
        title="Manage result media"
        description={managedGeneration ? `${managedGeneration.provider} · ${managedGeneration.model}` : undefined}
      >
        {managedGeneration ? (
          <div className="grid gap-4">
            <section>
              <h3 className="text-sm font-semibold">Attached results</h3>
              {managedResults.length ? (
                <div className="mt-2 grid gap-2">
                  {managedResults.map((asset) => (
                    <div className="list-row" key={asset.id}>
                      <div className="flex min-w-0 items-center gap-3"><AssetKindIcon asset={asset} /><div className="min-w-0"><div className="truncate text-xs font-semibold">{asset.filename}</div><div className="quiet mt-1 text-[0.65rem]">{titleCase(asset.kind)} · {titleCase(asset.reviewStatus)}{asset.deletedAt ? " · In trash" : ""}</div></div></div>
                      <Button className="icon-button" aria-label={`Remove ${asset.filename} from generation`} onClick={() => void detachResult(asset)}><Unlink size={15} /></Button>
                    </div>
                  ))}
                </div>
              ) : <p className="muted mt-2 text-xs">No media is attached to this generation yet.</p>}
            </section>
            <section className="rounded-xl border border-[var(--line)] bg-black/10 p-3">
              <Field label="Add result media" hint="Only active media from this project is available.">
                <select className="select" aria-label="Result media" value={effectiveResultAssetId} onChange={(event) => setResultAssetId(event.target.value)} disabled={!availableResults.length}>
                  {availableResults.length
                    ? availableResults.map((asset) => <option key={asset.id} value={asset.id}>{asset.filename} · {titleCase(asset.kind)}</option>)
                    : <option value="">All available media is already attached</option>}
                </select>
              </Field>
              <div className="mt-3 flex justify-end"><Button onClick={attachResult} disabled={!effectiveResultAssetId}><Link2 size={15} />Attach result</Button></div>
            </section>
            {resultError ? <p role="alert" className="text-xs text-[var(--danger)]">{resultError}</p> : null}
            <div className="flex justify-end"><Button onClick={closeResults}>Done</Button></div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function AssetKindIcon({ asset }: { asset: Asset }) {
  if (asset.kind === "image") return <FileImage size={15} aria-hidden="true" />;
  if (asset.kind === "audio") return <FileAudio size={15} aria-hidden="true" />;
  return <FileVideo size={15} aria-hidden="true" />;
}

function OutcomeBadge({ outcome }: { outcome: AssetReviewStatus }) {
  const color = outcome === "selected" ? "var(--mint)" : outcome === "rejected" ? "var(--danger)" : "var(--muted)";
  return <span className="badge" style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}>{titleCase(outcome)}</span>;
}

function StatusBadge({ status }: { status: GenerationOperationalStatus }) {
  const color = status === "completed"
    ? "var(--mint)"
    : status === "failed" || status === "submission_unknown"
      ? "var(--danger)"
      : status === "cancelled"
        ? "var(--quiet)"
        : "var(--violet-strong)";
  return <span className="badge" style={{ color }}>{titleCase(status.replaceAll("_", " "))}</span>;
}

function formatMicros(value: number): string {
  return formatCurrency(Math.round(value / 10_000));
}
