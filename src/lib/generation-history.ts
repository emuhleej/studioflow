import type {
  Asset,
  AssetReviewStatus,
  GenerationRecord,
  PromptVersion,
  WorkspaceData,
} from '../types';

export interface GenerationInput {
  episodeId: string;
  shotId?: string | undefined;
  promptVersionId?: string | undefined;
  provider: string;
  model: string;
  costCents: number;
  durationSeconds?: number | undefined;
  notes: string;
}

export function validateGenerationInput(
  workspace: WorkspaceData,
  input: GenerationInput
): string | null {
  if (!workspace.episodes.some((episode) => episode.id === input.episodeId))
    return 'Episode not found.';
  if (!input.provider.trim()) return 'Enter the generation provider.';
  if (!input.model.trim()) return 'Enter the model name.';
  if (!Number.isInteger(input.costCents) || input.costCents < 0)
    return 'Cost must be zero or a positive number of cents.';
  if (
    input.durationSeconds !== undefined &&
    (!Number.isFinite(input.durationSeconds) ||
      input.durationSeconds <= 0 ||
      input.durationSeconds > 14_400)
  ) {
    return 'Duration must be between 0 and 14,400 seconds.';
  }

  if (input.shotId) {
    const shot = workspace.shots.find((item) => item.id === input.shotId);
    const scene = shot ? workspace.scenes.find((item) => item.id === shot.sceneId) : undefined;
    if (!scene || scene.episodeId !== input.episodeId) return 'Choose a shot from this episode.';
  }

  if (input.promptVersionId) {
    const prompt = workspace.prompts.find((item) => item.id === input.promptVersionId);
    if (!prompt || prompt.episodeId !== input.episodeId)
      return 'Choose a prompt version from this episode.';
    if (prompt.shotId && prompt.shotId !== input.shotId)
      return 'The generation shot must match the selected prompt version.';
  }

  return null;
}

export function getEpisodeGenerationHistory(
  generations: GenerationRecord[],
  episodeId: string
): GenerationRecord[] {
  return generations
    .filter((generation) => generation.episodeId === episodeId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getPromptVersionLabel(prompt: PromptVersion, shotTitle?: string): string {
  const purpose = prompt.purpose.charAt(0).toUpperCase() + prompt.purpose.slice(1);
  return `${purpose} v${prompt.version} · ${shotTitle ?? 'Episode-wide'}`;
}

export function getGenerationResultAssets(workspace: WorkspaceData, generationId: string): Asset[] {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (!generation) return [];
  const linkedIds = new Set([
    ...generation.assetIds,
    ...workspace.assetLinks
      .filter((link) => link.targetType === 'generation' && link.targetId === generationId)
      .map((link) => link.assetId),
  ]);
  return workspace.assets.filter((asset) => linkedIds.has(asset.id));
}

export function getEligibleGenerationAssets(
  workspace: WorkspaceData,
  generationId: string
): Asset[] {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (!generation) return [];
  const episode = workspace.episodes.find((item) => item.id === generation.episodeId);
  const series = episode
    ? workspace.series.find((item) => item.id === episode.seriesId)
    : undefined;
  if (!series) return [];
  return workspace.assets
    .filter((asset) => asset.projectId === series.projectId && !asset.deletedAt)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function validateGenerationAssetLink(
  workspace: WorkspaceData,
  generationId: string,
  assetId: string
): string | null {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (!generation) return 'Generation record not found.';
  const asset = workspace.assets.find((item) => item.id === assetId);
  if (!asset) return 'Media asset not found.';
  if (asset.deletedAt) return 'Restore this media before linking it as a result.';
  if (!getEligibleGenerationAssets(workspace, generationId).some((item) => item.id === assetId)) {
    return 'Choose media from the same project as this generation.';
  }
  return null;
}

export function validateGenerationOutcome(
  workspace: WorkspaceData,
  generationId: string,
  outcome: AssetReviewStatus
): string | null {
  if (!workspace.generations.some((item) => item.id === generationId))
    return 'Generation record not found.';
  if (!['unreviewed', 'selected', 'rejected'].includes(outcome))
    return 'Choose a valid generation decision.';
  return null;
}
