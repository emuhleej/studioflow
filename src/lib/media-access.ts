import type { Asset } from "../types";
import { loadAssetBlob } from "./blob-store";
import { getRemoteAssetAccess } from "./media-upload";

export type MediaAccessPurpose = "preview" | "download";

export interface MediaAccessHandle {
  url: string;
  expiresAt?: number;
  release: () => void;
}

export async function createMediaAccess(
  asset: Asset,
  isDemo: boolean,
  purpose: MediaAccessPurpose,
): Promise<MediaAccessHandle> {
  if (isDemo) {
    const blob = await loadAssetBlob(asset.id);
    if (!blob) throw new Error("This browser no longer has the media file. Upload it again to restore access.");
    const url = URL.createObjectURL(blob);
    return { url, release: () => URL.revokeObjectURL(url) };
  }

  const access = await getRemoteAssetAccess(asset.id, purpose === "download" ? "attachment" : "inline");
  return {
    url: access.url,
    expiresAt: Date.now() + access.expiresInSeconds * 1000,
    release: () => undefined,
  };
}

export function getMediaRefreshDelay(expiresAt: number | undefined, currentTime = Date.now()): number | null {
  if (!expiresAt) return null;
  return Math.max(1_000, expiresAt - currentTime - 30_000);
}

export async function downloadMediaAsset(asset: Asset, isDemo: boolean): Promise<void> {
  const access = await createMediaAccess(asset, isDemo, "download");
  const anchor = document.createElement("a");
  anchor.href = access.url;
  anchor.download = asset.filename;
  anchor.rel = "noreferrer";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(access.release, 0);
}
