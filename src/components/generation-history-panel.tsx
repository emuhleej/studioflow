import { useMemo, useState, type FormEvent } from "react";
import { Check, FileAudio, FileImage, FileVideo, Link2, Plus, RotateCcw, Sparkles, Unlink, X } from "lucide-react";
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
import type { Asset, AssetReviewStatus } from "../types";
import { Button, EmptyState, Field, Modal, SubmitButton } from "./ui";

export function GenerationHistoryPanel({ episodeId }: { episodeId: string }) {
  const { data, addGeneration, linkGenerationAsset, unlinkGenerationAsset, setGenerationOutcome } = useStudio();
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

  return (
    <section className="panel panel-pad">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="eyebrow">Manual generation log</div><h2 className="section-title mt-1">Provider attempts</h2></div>
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
                  <div className="flex flex-wrap items-center justify-end gap-2"><OutcomeBadge outcome={generation.outcome} /><span className="badge">{formatCurrency(generation.costCents)}</span></div>
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
