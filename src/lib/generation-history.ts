import type { GenerationRecord, PromptVersion, WorkspaceData } from "../types";

export interface GenerationInput {
  episodeId: string;
  shotId?: string;
  promptVersionId?: string;
  provider: string;
  model: string;
  costCents: number;
  durationSeconds?: number;
  notes: string;
}

export function validateGenerationInput(workspace: WorkspaceData, input: GenerationInput): string | null {
  if (!workspace.episodes.some((episode) => episode.id === input.episodeId)) return "Episode not found.";
  if (!input.provider.trim()) return "Enter the generation provider.";
  if (!input.model.trim()) return "Enter the model name.";
  if (!Number.isInteger(input.costCents) || input.costCents < 0) return "Cost must be zero or a positive number of cents.";
  if (input.durationSeconds !== undefined && (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0 || input.durationSeconds > 14_400)) {
    return "Duration must be between 0 and 14,400 seconds.";
  }

  if (input.shotId) {
    const shot = workspace.shots.find((item) => item.id === input.shotId);
    const scene = shot ? workspace.scenes.find((item) => item.id === shot.sceneId) : undefined;
    if (!scene || scene.episodeId !== input.episodeId) return "Choose a shot from this episode.";
  }

  if (input.promptVersionId) {
    const prompt = workspace.prompts.find((item) => item.id === input.promptVersionId);
    if (!prompt || prompt.episodeId !== input.episodeId) return "Choose a prompt version from this episode.";
    if (prompt.shotId && prompt.shotId !== input.shotId) return "The generation shot must match the selected prompt version.";
  }

  return null;
}

export function getEpisodeGenerationHistory(generations: GenerationRecord[], episodeId: string): GenerationRecord[] {
  return generations
    .filter((generation) => generation.episodeId === episodeId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getPromptVersionLabel(prompt: PromptVersion, shotTitle?: string): string {
  const purpose = prompt.purpose.charAt(0).toUpperCase() + prompt.purpose.slice(1);
  return `${purpose} v${prompt.version} · ${shotTitle ?? "Episode-wide"}`;
}
