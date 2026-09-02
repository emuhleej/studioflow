import { describe, expect, it } from "vitest";
import { demoWorkspace } from "../data/demo";
import {
  getEligibleGenerationAssets,
  getEpisodeGenerationHistory,
  getGenerationResultAssets,
  getPromptVersionLabel,
  validateGenerationAssetLink,
  validateGenerationInput,
  validateGenerationOutcome,
  type GenerationInput,
} from "./generation-history";

const validInput: GenerationInput = {
  episodeId: "episode-fridge",
  shotId: "shot-1",
  promptVersionId: "prompt-shot-one-v2",
  provider: "Example Video",
  model: "cinema-v2",
  costCents: 125,
  durationSeconds: 6,
  notes: "Manual test record",
};

describe("generation history", () => {
  it("accepts complete manual provenance", () => {
    expect(validateGenerationInput(demoWorkspace, validInput)).toBeNull();
  });

  it("requires provider and model names", () => {
    expect(validateGenerationInput(demoWorkspace, { ...validInput, provider: "  " })).toBe("Enter the generation provider.");
    expect(validateGenerationInput(demoWorkspace, { ...validInput, model: "" })).toBe("Enter the model name.");
  });

  it("rejects invalid cost and duration values", () => {
    expect(validateGenerationInput(demoWorkspace, { ...validInput, costCents: -1 })).toBe("Cost must be zero or a positive number of cents.");
    expect(validateGenerationInput(demoWorkspace, { ...validInput, costCents: 1.5 })).toBe("Cost must be zero or a positive number of cents.");
    expect(validateGenerationInput(demoWorkspace, { ...validInput, durationSeconds: 0 })).toBe("Duration must be between 0 and 14,400 seconds.");
  });

  it("keeps shot and prompt references inside the episode", () => {
    expect(validateGenerationInput(demoWorkspace, { ...validInput, episodeId: "episode-thermostat" })).toBe("Choose a shot from this episode.");
    expect(validateGenerationInput(demoWorkspace, { ...validInput, shotId: "shot-2" })).toBe("The generation shot must match the selected prompt version.");
  });

  it("sorts one episode's records newest first", () => {
    const older = { ...demoWorkspace.generations[0], createdAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...demoWorkspace.generations[0], id: "generation-new", createdAt: "2026-02-01T00:00:00.000Z" };
    const other = { ...newer, id: "generation-other", episodeId: "episode-laundry", createdAt: "2026-03-01T00:00:00.000Z" };
    expect(getEpisodeGenerationHistory([older, newer, other], "episode-fridge").map((item) => item.id)).toEqual(["generation-new", older.id]);
  });

  it("builds a readable immutable prompt reference label", () => {
    expect(getPromptVersionLabel(demoWorkspace.prompts[1], "Immediate argument")).toBe("Video v2 · Immediate argument");
  });

  it("combines legacy result IDs and explicit generation links without duplicates", () => {
    const workspace = structuredClone(demoWorkspace);
    workspace.assetLinks.push({
      ...workspace.assetLinks[0],
      id: "generation-result-link",
      assetId: "asset-shot-one",
      targetType: "generation",
      targetId: "generation-hook-v3",
    });
    expect(getGenerationResultAssets(workspace, "generation-hook-v3").map((asset) => asset.id)).toEqual(["asset-shot-one"]);
  });

  it("offers active media from the generation project and rejects invalid links", () => {
    const workspace = structuredClone(demoWorkspace);
    workspace.assets.push({ ...workspace.assets[0], id: "trashed-result", deletedAt: "2026-09-01T00:00:00.000Z" });
    workspace.projects.push({ ...workspace.projects[0], id: "other-project" });
    workspace.assets.push({ ...workspace.assets[0], id: "other-project-result", projectId: "other-project" });

    const eligibleIds = getEligibleGenerationAssets(workspace, "generation-hook-v3").map((asset) => asset.id);
    expect(eligibleIds).toContain("asset-voice");
    expect(eligibleIds).not.toContain("trashed-result");
    expect(eligibleIds).not.toContain("other-project-result");
    expect(validateGenerationAssetLink(workspace, "generation-hook-v3", "asset-voice")).toBeNull();
    expect(validateGenerationAssetLink(workspace, "generation-hook-v3", "trashed-result")).toBe("Restore this media before linking it as a result.");
    expect(validateGenerationAssetLink(workspace, "generation-hook-v3", "other-project-result")).toBe("Choose media from the same project as this generation.");
  });

  it("accepts only decisions for an existing generation", () => {
    expect(validateGenerationOutcome(demoWorkspace, "generation-hook-v3", "selected")).toBeNull();
    expect(validateGenerationOutcome(demoWorkspace, "missing-generation", "rejected")).toBe("Generation record not found.");
  });
});
