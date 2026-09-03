import type { PromptVersion } from '../types';

export type PromptPurpose = PromptVersion['purpose'];

export function getNextPromptVersion(
  prompts: PromptVersion[],
  episodeId: string,
  purpose: PromptPurpose,
  shotId?: string
): number {
  const versions = prompts
    .filter(
      (prompt) =>
        prompt.episodeId === episodeId && prompt.shotId === shotId && prompt.purpose === purpose
    )
    .map((prompt) => prompt.version);

  return versions.length ? Math.max(...versions) + 1 : 1;
}

export function getEpisodePromptHistory(
  prompts: PromptVersion[],
  episodeId: string
): PromptVersion[] {
  return prompts
    .filter((prompt) => prompt.episodeId === episodeId)
    .sort(
      (left, right) => right.createdAt.localeCompare(left.createdAt) || right.version - left.version
    );
}

export function validatePromptContent(content: string): string | null {
  return content.trim() ? null : 'Enter a prompt before saving a version.';
}
