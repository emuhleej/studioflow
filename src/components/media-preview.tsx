import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileAudio, FileImage, FileVideo, LoaderCircle, RefreshCw } from "lucide-react";
import { createMediaAccess, downloadMediaAsset, getMediaRefreshDelay, type MediaAccessHandle } from "../lib/media-access";
import { useStudio } from "../state/studio-store";
import type { Asset } from "../types";
import { Button } from "./ui";

export function MediaPreview({ asset, controls = false }: { asset: Asset; controls?: boolean }) {
  const { isDemo } = useStudio();
  const [access, setAccess] = useState<MediaAccessHandle | null>(null);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const automaticRecoveryUsed = useRef(false);

  const retry = useCallback(() => {
    automaticRecoveryUsed.current = false;
    setError("");
    setAccess(null);
    setRequestVersion((current) => current + 1);
  }, []);

  const recoverPlayback = useCallback(() => {
    if (!automaticRecoveryUsed.current) {
      automaticRecoveryUsed.current = true;
      setAccess(null);
      setRequestVersion((current) => current + 1);
      return;
    }
    setError("The private preview could not be loaded. Request a fresh preview URL and try again.");
  }, []);

  useEffect(() => {
    if (asset.source === "demo") return;
    let active = true;
    let handle: MediaAccessHandle | null = null;
    let refreshTimer: number | undefined;

    void createMediaAccess(asset, isDemo, "preview")
      .then((nextAccess) => {
        if (!active) {
          nextAccess.release();
          return;
        }
        handle = nextAccess;
        setAccess(nextAccess);
        setError("");
        const delay = getMediaRefreshDelay(nextAccess.expiresAt);
        if (delay !== null) refreshTimer = window.setTimeout(() => setRequestVersion((current) => current + 1), delay);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "The private preview could not be loaded.");
      });

    return () => {
      active = false;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      handle?.release();
    };
  }, [asset, isDemo, requestVersion]);

  if (asset.source === "demo" || asset.storageKey.startsWith("fake://")) return <MediaPlaceholder asset={asset} />;
  if (error) {
    return (
      <div className="media-placeholder flex-col gap-2 p-4 text-center" role="alert">
        <MediaKindIcon asset={asset} />
        <span className="max-w-xs text-xs text-[#ffb3ad]">{error}</span>
        {controls ? <Button onClick={retry}><RefreshCw size={15} />Retry preview</Button> : null}
      </div>
    );
  }
  if (!access) return <div className="media-placeholder" aria-label={`Loading ${asset.filename}`}><LoaderCircle className="animate-spin" /></div>;
  if (asset.kind === "image") return <div className="media-placeholder"><img src={access.url} alt={asset.filename} onError={recoverPlayback} /></div>;
  if (asset.kind === "video") return <div className="media-placeholder"><video src={access.url} controls={controls} preload="metadata" aria-label={asset.filename} onError={recoverPlayback} /></div>;
  return <div className="media-placeholder"><audio src={access.url} controls aria-label={asset.filename} onError={recoverPlayback} /></div>;
}

function MediaPlaceholder({ asset }: { asset: Asset }) {
  return <div className="media-placeholder"><MediaKindIcon asset={asset} /></div>;
}

function MediaKindIcon({ asset }: { asset: Asset }) {
  return asset.kind === "image" ? <FileImage size={28} /> : asset.kind === "audio" ? <FileAudio size={28} /> : <FileVideo size={28} />;
}

export function MediaDownloadButton({ asset }: { asset: Asset }) {
  const { isDemo } = useStudio();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      await downloadMediaAsset(asset, isDemo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The download could not be prepared.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-1">
      <Button onClick={() => void download()} disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />}
        {busy ? "Preparing…" : "Download"}
      </Button>
      {error ? <span className="text-xs text-[#ffb3ad]" role="alert">{error}</span> : null}
    </div>
  );
}
