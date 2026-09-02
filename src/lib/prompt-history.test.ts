import { describe, expect, it } from "vitest";
import { demoWorkspace } from "../data/demo";
import { getEpisodePromptHistory, getNextPromptVersion, validatePromptContent } from "./prompt-history";

describe("prompt history", () => {
  it("increments versions within an episode, purpose, and shot chain", () => {
    expect(getNextPromptVersion(demoWorkspace.prompts, "episode-fridge", "video", "shot-1")).toBe(3);
    expect(getNextPromptVersion(demoWorkspace.prompts, "episode-fridge", "image", "shot-1")).toBe(1);
    expect(getNextPromptVersion(demoWorkspace.prompts, "episode-fridge", "video")).toBe(1);
  });

  it("uses the highest version when a chain contains a gap", () => {
    const prompts = [
      { ...demoWorkspace.prompts[0], version: 1 },
      { ...demoWorkspace.prompts[0], id: "prompt-v4", version: 4 },
    ];
    expect(getNextPromptVersion(prompts, "episode-fridge", "video", "shot-1")).toBe(5);
  });

  it("returns only the requested episode in newest-first order", () => {
    const prompts = [
      { ...demoWorkspace.prompts[0], createdAt: "2026-01-01T00:00:00.000Z" },
      { ...demoWorkspace.prompts[1], createdAt: "2026-02-01T00:00:00.000Z" },
      { ...demoWorkspace.prompts[0], id: "other", episodeId: "other-episode", createdAt: "2026-03-01T00:00:00.000Z" },
    ];
    expect(getEpisodePromptHistory(prompts, "episode-fridge").map((prompt) => prompt.id)).toEqual([
      "prompt-shot-one-v2",
      "prompt-shot-one-v1",
    ]);
  });

  it("rejects blank content without changing exact nonblank content", () => {
    expect(validatePromptContent("  \n ")).toBe("Enter a prompt before saving a version.");
    expect(validatePromptContent("  exact prompt  ")).toBeNull();
  });
});
