import type { Asset, AssetKind, AssetLinkTarget, Episode, EpisodeTotals, WorkspaceData } from "../types";

export const B2_FREE_BYTES = 10_000_000_000;
export const B2_WARNING_BYTES = 8_000_000_000;
export const B2_UPLOAD_BLOCK_BYTES = 9_000_000_000;
export const MAX_ASSET_BYTES = 2_000_000_000;
export const ACCEPTED_MEDIA_MIME_TYPES: Record<AssetKind, readonly string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"],
  audio: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/aac", "audio/ogg", "audio/flac"],
  video: ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"],
};
const SITCOM_SHOT_WEIGHTS = [10, 14, 18, 18, 20] as const;

export function getSitcomShotDurations(targetDurationSeconds: number): number[] {
  const target = Math.min(90, Math.max(60, Math.round(targetDurationSeconds || 75)));
  const totalWeight = SITCOM_SHOT_WEIGHTS.reduce((sum, value) => sum + value, 0);
  const durations = SITCOM_SHOT_WEIGHTS.map((weight) => Math.max(4, Math.round((weight / totalWeight) * target)));
  const difference = target - durations.reduce((sum, value) => sum + value, 0);
  durations[0] += difference;
  return durations;
}

export function getEpisodeTotals(data: WorkspaceData, episodeId: string): EpisodeTotals {
  const episodeScenes = data.scenes.filter((scene) => scene.episodeId === episodeId);
  const sceneIds = new Set(episodeScenes.map((scene) => scene.id));
  const durationSeconds = data.shots
    .filter((shot) => sceneIds.has(shot.sceneId))
    .reduce((sum, shot) => sum + shot.durationSeconds, 0);
  const productionMinutes = data.timeEntries
    .filter((entry) => entry.episodeId === episodeId)
    .reduce((sum, entry) => sum + entry.minutes, 0);
  const costCents = data.costEntries
    .filter((entry) => entry.episodeId === episodeId)
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  return { durationSeconds, productionMinutes, costCents };
}

export function getEpisodeAssets(data: WorkspaceData, episodeId: string): Asset[] {
  const sceneIds = new Set(data.scenes.filter((scene) => scene.episodeId === episodeId).map((scene) => scene.id));
  const episodeShots = data.shots.filter((shot) => sceneIds.has(shot.sceneId));
  const shotIds = new Set(episodeShots.map((shot) => shot.id));
  const episodeGenerations = data.generations.filter((generation) => generation.episodeId === episodeId);
  const generationIds = new Set(episodeGenerations.map((generation) => generation.id));
  const linkedAssetIds = new Set<string>();

  for (const shot of episodeShots) {
    for (const assetId of shot.assetIds) linkedAssetIds.add(assetId);
  }
  for (const generation of episodeGenerations) {
    for (const assetId of generation.assetIds) linkedAssetIds.add(assetId);
  }
  for (const link of data.assetLinks) {
    const belongsToEpisode =
      (link.targetType === "episode" && link.targetId === episodeId) ||
      (link.targetType === "scene" && sceneIds.has(link.targetId)) ||
      (link.targetType === "shot" && shotIds.has(link.targetId)) ||
      (link.targetType === "generation" && generationIds.has(link.targetId));
    if (belongsToEpisode) linkedAssetIds.add(link.assetId);
  }

  return data.assets.filter((asset) => asset.episodeId === episodeId || linkedAssetIds.has(asset.id));
}

export function getActiveStorageBytes(data: WorkspaceData): number {
  return data.assets.reduce((sum, asset) => sum + asset.bytes, 0);
}

export function getNextEpisodeNumber(data: WorkspaceData, seriesId: string): number {
  const numbers = data.episodes.filter((episode) => episode.seriesId === seriesId).map((episode) => episode.number);
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

export function getEpisodeLabel(episode: Episode): string {
  return `E${String(episode.number).padStart(2, "0")} · ${episode.title}`;
}

export function canAcceptAsset(
  data: WorkspaceData,
  candidate: { bytes: number; kind: AssetKind; mimeType: string },
): { allowed: boolean; reason?: string } {
  if (!Number.isSafeInteger(candidate.bytes) || candidate.bytes <= 0) {
    return { allowed: false, reason: "Choose a file that is not empty." };
  }
  if (candidate.bytes > MAX_ASSET_BYTES) return { allowed: false, reason: "Files must be 2 GB or smaller." };
  if (!ACCEPTED_MEDIA_MIME_TYPES[candidate.kind].includes(candidate.mimeType.toLowerCase())) {
    return { allowed: false, reason: `Unsupported ${candidate.kind} format: ${candidate.mimeType || "unknown"}.` };
  }
  if (getActiveStorageBytes(data) + candidate.bytes > B2_UPLOAD_BLOCK_BYTES) {
    return { allowed: false, reason: "This upload would cross StudioFlow's 9 GB safety limit." };
  }
  return { allowed: true };
}

export interface AssetLinkOption {
  targetType: AssetLinkTarget;
  targetId: string;
  label: string;
}

export function getAssetLinkOptions(data: WorkspaceData, asset: Asset): AssetLinkOption[] {
  const series = data.series.filter((item) => item.projectId === asset.projectId);
  const seriesIds = new Set(series.map((item) => item.id));
  const episodes = data.episodes.filter((item) => seriesIds.has(item.seriesId));
  const episodeIds = new Set(episodes.map((item) => item.id));
  const scenes = data.scenes.filter((item) => episodeIds.has(item.episodeId));
  const sceneIds = new Set(scenes.map((item) => item.id));

  return [
    ...data.projects.filter((item) => item.id === asset.projectId).map((item) => ({ targetType: "project" as const, targetId: item.id, label: item.title })),
    ...series.map((item) => ({ targetType: "series" as const, targetId: item.id, label: item.title })),
    ...episodes.map((item) => ({ targetType: "episode" as const, targetId: item.id, label: `E${String(item.number).padStart(2, "0")} · ${item.title}` })),
    ...scenes.map((item) => ({ targetType: "scene" as const, targetId: item.id, label: item.title })),
    ...data.shots.filter((item) => sceneIds.has(item.sceneId)).map((item) => ({ targetType: "shot" as const, targetId: item.id, label: item.title })),
    ...data.entities.filter((item) => item.projectId === asset.projectId).map((item) => ({ targetType: "entity" as const, targetId: item.id, label: item.name })),
    ...data.generations.filter((item) => episodeIds.has(item.episodeId)).map((item) => ({ targetType: "generation" as const, targetId: item.id, label: `${item.provider} · ${item.model}` })),
  ];
}

export function removeAssetFromWorkspace(data: WorkspaceData, assetId: string): WorkspaceData {
  return {
    ...data,
    assets: data.assets.filter((asset) => asset.id !== assetId),
    assetLinks: data.assetLinks.filter((link) => link.assetId !== assetId),
    shots: data.shots.map((shot) => ({ ...shot, assetIds: shot.assetIds.filter((id) => id !== assetId) })),
    entities: data.entities.map((entity) => ({
      ...entity,
      referenceAssetIds: entity.referenceAssetIds.filter((id) => id !== assetId),
    })),
    generations: data.generations.map((generation) => ({
      ...generation,
      assetIds: generation.assetIds.filter((id) => id !== assetId),
    })),
  };
}
