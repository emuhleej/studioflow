import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, ImagePlus, Link2, RotateCcw, Save, Search, Trash2, Unlink, Upload } from "lucide-react";
import { MediaDownloadButton, MediaPreview } from "../components/media-preview";
import { UploadTaskList } from "../components/upload-task-list";
import { Button, EmptyState, Field, Modal, PageHeading } from "../components/ui";
import { B2_UPLOAD_BLOCK_BYTES, getActiveStorageBytes, getAssetLinkOptions } from "../lib/domain";
import { formatBytes, titleCase } from "../lib/format";
import { useStudio } from "../state/studio-store";
import type { Asset, AssetKind, AssetLinkTarget } from "../types";

function inferKind(file: File): AssetKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

export function MediaPage() {
  const studio = useStudio();
  const {
    data,
    uploadTasks,
    startUpload,
    pauseUpload,
    resumeUpload,
    retryUpload,
    cancelUpload,
    dismissUpload,
    setAssetReview,
    trashAsset,
    restoreAsset,
    permanentlyDeleteAsset,
  } = studio;
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"active" | "trash">("active");
  const [kind, setKind] = useState<AssetKind | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState("");
  const project = data.projects.find((item) => !item.archivedAt);
  const storage = getActiveStorageBytes(data);
  const selected = data.assets.find((asset) => asset.id === selectedId) ?? null;
  const deleteCandidate = data.assets.find((asset) => asset.id === deleteId) ?? null;

  const assets = useMemo(() => data.assets.filter((asset) => {
    const trashMatch = filter === "trash" ? Boolean(asset.deletedAt) : !asset.deletedAt;
    return trashMatch && (kind === "all" || asset.kind === kind) && asset.filename.toLowerCase().includes(query.toLowerCase());
  }), [data.assets, filter, kind, query]);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !project) return;
    const inferred = inferKind(file);
    if (!inferred) {
      setError("Choose an image, audio file, or video file.");
      return;
    }
    setError("");
    try {
      startUpload({ file, projectId: project.id, kind: inferred });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    }
  };

  const confirmPermanentDelete = async () => {
    if (!deleteCandidate) return;
    setDeleteBusy(true);
    setError("");
    try {
      await permanentlyDeleteAsset(deleteCandidate.id);
      if (selectedId === deleteCandidate.id) setSelectedId(null);
      setDeleteId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The media could not be permanently deleted.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <PageHeading
        eyebrow="Media library"
        title="Every asset, with context."
        description="Upload, preview, review, link, download, and safely remove the files used across your productions."
        actions={(
          <>
            <input ref={inputRef} className="hidden" type="file" accept="image/*,audio/*,video/*,.mov,.m4a" onChange={chooseFile} />
            <Button variant="primary" onClick={() => inputRef.current?.click()} disabled={!project}><Upload size={16} />Upload media</Button>
          </>
        )}
      />
      {error ? <div className="mb-4 rounded-xl border border-[rgb(240_125_118_/_0.35)] bg-[rgb(240_125_118_/_0.08)] p-3 text-sm text-[#ffb3ad]" role="alert">{error}</div> : null}
      <UploadTaskList tasks={uploadTasks} onPause={pauseUpload} onResume={resumeUpload} onRetry={retryUpload} onCancel={(taskId) => void cancelUpload(taskId)} onDismiss={dismissUpload} />
      <section className="panel panel-pad mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex justify-between text-xs"><span className="muted">Storage safety meter</span><span>{formatBytes(storage)} / 9 GB</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, storage / B2_UPLOAD_BLOCK_BYTES * 100)}%` }} /></div>
          </div>
          <span className="badge">{formatBytes(Math.max(0, B2_UPLOAD_BLOCK_BYTES - storage))} available</span>
        </div>
      </section>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="tabs">
          <button className="tab" aria-selected={filter === "active"} onClick={() => setFilter("active")}>Library</button>
          <button className="tab" aria-selected={filter === "trash"} onClick={() => setFilter("trash")}>Trash</button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className="select sm:w-36" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="all">All media</option><option value="image">Images</option><option value="audio">Audio</option><option value="video">Video</option>
          </select>
          <label className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[var(--quiet)]" /><input className="input !pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files…" /></label>
        </div>
      </div>
      {assets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <article key={asset.id} className="panel overflow-hidden p-3">
              <button className="block w-full text-left" onClick={() => setSelectedId(asset.id)}>
                <MediaPreview asset={asset} />
                <div className="mt-3"><div className="truncate text-sm font-semibold">{asset.filename}</div><div className="muted mt-1 flex justify-between text-xs"><span>{titleCase(asset.kind)}</span><span>{formatBytes(asset.bytes)}</span></div></div>
              </button>
              <div className="mt-3 flex gap-2">
                {filter === "active" ? (
                  <><Button className="flex-1" onClick={() => setAssetReview(asset.id, "selected")}><Check size={15} />Select</Button><Button className="icon-button" aria-label="Move to trash" onClick={() => trashAsset(asset.id)}><Trash2 size={15} /></Button></>
                ) : (
                  <><Button className="flex-1" onClick={() => restoreAsset(asset.id)}><RotateCcw size={15} />Restore</Button><Button variant="danger" className="icon-button" aria-label={`Permanently delete ${asset.filename}`} onClick={() => setDeleteId(asset.id)}><Trash2 size={15} /></Button></>
                )}
              </div>
              <div className="mt-2 flex justify-between"><span className="badge">{titleCase(asset.reviewStatus)}</span><span className="quiet text-[0.65rem]">{asset.source}</span></div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel"><EmptyState icon={filter === "trash" ? <Trash2 size={28} /> : <ImagePlus size={28} />} title={filter === "trash" ? "Trash is empty" : "No media found"} description={filter === "trash" ? "Removed media stays recoverable here until you permanently delete it." : "Upload an image, audio file, or video to begin building the asset library."} action={filter === "active" ? <Button variant="primary" onClick={() => inputRef.current?.click()}><Upload size={16} />Upload media</Button> : undefined} /></section>
      )}
      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected?.filename ?? "Media detail"} description={selected ? `${titleCase(selected.kind)} · ${formatBytes(selected.bytes)}` : undefined}>
        {selected ? <AssetDetail key={selected.id} asset={selected} /> : null}
      </Modal>
      <Modal
        open={Boolean(deleteCandidate)}
        onClose={() => !deleteBusy && setDeleteId(null)}
        title="Delete media permanently?"
        description="This cannot be undone. StudioFlow will remove the stored file and every production link to it."
        footer={<><Button onClick={() => setDeleteId(null)} disabled={deleteBusy}>Cancel</Button><Button variant="danger" onClick={() => void confirmPermanentDelete()} disabled={deleteBusy}>{deleteBusy ? "Deleting…" : "Delete permanently"}</Button></>}
      >
        <p className="muted text-sm leading-6">{deleteCandidate?.filename} will no longer be recoverable from StudioFlow.</p>
      </Modal>
    </div>
  );
}

function AssetDetail({ asset }: { asset: Asset }) {
  const { data, setAssetReview, updateAssetMetadata, addAssetLink, removeAssetLink } = useStudio();
  const [notes, setNotes] = useState(asset.notes);
  const [duration, setDuration] = useState(asset.durationSeconds?.toString() ?? "");
  const [width, setWidth] = useState(asset.width?.toString() ?? "");
  const [height, setHeight] = useState(asset.height?.toString() ?? "");
  const [message, setMessage] = useState("");
  const links = data.assetLinks.filter((link) => link.assetId === asset.id && !link.deletedAt);
  const allOptions = getAssetLinkOptions(data, asset);
  const linkedKeys = new Set(links.map((link) => `${link.targetType}|${link.targetId}`));
  const options = allOptions.filter((option) => !linkedKeys.has(`${option.targetType}|${option.targetId}`));
  const [targetKey, setTargetKey] = useState(options[0] ? `${options[0].targetType}|${options[0].targetId}` : "");
  const effectiveTargetKey = options.some((option) => `${option.targetType}|${option.targetId}` === targetKey)
    ? targetKey
    : options[0] ? `${options[0].targetType}|${options[0].targetId}` : "";
  const labels = new Map(allOptions.map((option) => [`${option.targetType}|${option.targetId}`, option.label]));

  const saveMetadata = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAssetMetadata(asset.id, {
      notes: notes.trim(),
      durationSeconds: optionalNumber(duration),
      width: optionalNumber(width, true),
      height: optionalNumber(height, true),
    });
    setMessage("Media details saved.");
  };

  const linkTarget = () => {
    if (!effectiveTargetKey) return;
    const [targetType, targetId] = effectiveTargetKey.split("|", 2) as [AssetLinkTarget, string];
    try {
      addAssetLink(asset.id, targetType, targetId);
      setMessage("Production link added.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The production link could not be added.");
    }
  };

  return (
    <div className="grid gap-4">
      <MediaPreview asset={asset} controls />
      <div className="flex flex-wrap items-start gap-2"><MediaDownloadButton asset={asset} /></div>
      <form className="grid gap-3" onSubmit={saveMetadata}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Review"><select className="select" value={asset.reviewStatus} onChange={(event) => setAssetReview(asset.id, event.target.value as Asset["reviewStatus"])}><option value="unreviewed">Unreviewed</option><option value="selected">Selected</option><option value="rejected">Rejected</option></select></Field>
          <Field label="Source"><input className="input" value={titleCase(asset.source)} disabled /></Field>
        </div>
        <Field label="Notes"><textarea className="textarea min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Duration (seconds)"><input className="input" type="number" min="0" step="0.001" value={duration} onChange={(event) => setDuration(event.target.value)} /></Field>
          <Field label="Width (px)"><input className="input" type="number" min="0" step="1" value={width} onChange={(event) => setWidth(event.target.value)} /></Field>
          <Field label="Height (px)"><input className="input" type="number" min="0" step="1" value={height} onChange={(event) => setHeight(event.target.value)} /></Field>
        </div>
        <Button type="submit"><Save size={15} />Save details</Button>
      </form>
      <section className="rounded-xl border border-[var(--line)] bg-black/10 p-3">
        <div className="flex items-center gap-2"><Link2 size={16} color="var(--violet)" /><h3 className="text-sm font-semibold">Production links</h3></div>
        {links.length ? <div className="mt-3 grid gap-2">{links.map((link) => <div key={link.id} className="list-row"><div className="min-w-0"><div className="text-xs font-semibold">{titleCase(link.targetType)}</div><div className="muted mt-1 truncate text-xs">{labels.get(`${link.targetType}|${link.targetId}`) ?? link.targetId}</div></div><Button className="icon-button" aria-label={`Remove ${link.targetType} link`} onClick={() => void removeAssetLink(link.id).catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : "The link could not be removed."))}><Unlink size={15} /></Button></div>)}</div> : <p className="muted mt-2 text-xs">This media has no explicit production links yet.</p>}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select className="select min-w-0 flex-1" value={effectiveTargetKey} onChange={(event) => setTargetKey(event.target.value)} disabled={!options.length} aria-label="Production record">
            {options.length ? options.map((option) => <option key={`${option.targetType}|${option.targetId}`} value={`${option.targetType}|${option.targetId}`}>{titleCase(option.targetType)} · {option.label}</option>) : <option value="">All available records are linked</option>}
          </select>
          <Button onClick={linkTarget} disabled={!options.length}><Link2 size={15} />Add link</Button>
        </div>
      </section>
      {message ? <p className="text-xs text-[var(--mint)]" role="status">{message}</p> : null}
    </div>
  );
}

function optionalNumber(value: string, integer = false): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return integer ? Math.round(parsed) : parsed;
}
