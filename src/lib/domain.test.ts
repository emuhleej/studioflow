import { describe, expect, it } from "vitest";
import { demoWorkspace } from "../data/demo";
import {
  ACCEPTED_MEDIA_MIME_TYPES,
  B2_UPLOAD_BLOCK_BYTES,
  MAX_ASSET_BYTES,
  canAcceptAsset,
  getActiveStorageBytes,
  getAssetLinkOptions,
  getEpisodeAssets,
  getEpisodeTotals,
  getNextEpisodeNumber,
  getSitcomShotDurations,
  removeAssetFromWorkspace,
} from "./domain";

describe("StudioFlow domain calculations", () => {
  it("calculates hand-checkable episode duration, time, and cost totals", () => {
    const episode = demoWorkspace.episodes[0];
    const sceneIds = new Set(demoWorkspace.scenes.filter((scene) => scene.episodeId === episode.id).map((scene) => scene.id));
    const expectedDuration = demoWorkspace.shots.filter((shot) => sceneIds.has(shot.sceneId)).reduce((sum, shot) => sum + shot.durationSeconds, 0);
    const expectedMinutes = demoWorkspace.timeEntries.filter((entry) => entry.episodeId === episode.id).reduce((sum, entry) => sum + entry.minutes, 0);
    const expectedCost = demoWorkspace.costEntries.filter((entry) => entry.episodeId === episode.id).reduce((sum, entry) => sum + entry.amountCents, 0);

    expect(getEpisodeTotals(demoWorkspace, episode.id)).toEqual({
      durationSeconds: expectedDuration,
      productionMinutes: expectedMinutes,
      costCents: expectedCost,
    });
  });

  it("counts active and trashed media toward storage", () => {
    const expected = demoWorkspace.assets.reduce((sum, asset) => sum + asset.bytes, 0);
    expect(getActiveStorageBytes(demoWorkspace)).toBe(expected);
  });

  it("blocks oversized files and uploads that cross the 9 GB guardrail", () => {
    expect(canAcceptAsset(demoWorkspace, { bytes: MAX_ASSET_BYTES + 1, kind: "video", mimeType: "video/mp4" })).toEqual({
      allowed: false,
      reason: "Files must be 2 GB or smaller.",
    });

    const nearCap = structuredClone(demoWorkspace);
    nearCap.assets = [{ ...nearCap.assets[0], bytes: B2_UPLOAD_BLOCK_BYTES - 10 }];
    expect(canAcceptAsset(nearCap, { bytes: 11, kind: "video", mimeType: "video/mp4" }).allowed).toBe(false);
    expect(canAcceptAsset(nearCap, { bytes: 10, kind: "video", mimeType: "video/mp4" }).allowed).toBe(true);
  });

  it("accepts only non-empty files whose MIME type matches their media kind", () => {
    expect(canAcceptAsset(demoWorkspace, { bytes: 0, kind: "image", mimeType: "image/png" })).toEqual({
      allowed: false,
      reason: "Choose a file that is not empty.",
    });
    expect(canAcceptAsset(demoWorkspace, { bytes: 100, kind: "image", mimeType: "image/svg+xml" })).toEqual({
      allowed: false,
      reason: "Unsupported image format: image/svg+xml.",
    });
    expect(canAcceptAsset(demoWorkspace, { bytes: 100, kind: "audio", mimeType: "video/mp4" }).allowed).toBe(false);

    for (const [kind, mimeTypes] of Object.entries(ACCEPTED_MEDIA_MIME_TYPES)) {
      for (const mimeType of mimeTypes) {
        expect(canAcceptAsset(demoWorkspace, { bytes: 100, kind: kind as "image" | "audio" | "video", mimeType }).allowed).toBe(true);
      }
    }
  });

  it("increments episode numbers without reusing gaps", () => {
    const seriesId = demoWorkspace.series[0].id;
    const highest = Math.max(...demoWorkspace.episodes.filter((episode) => episode.seriesId === seriesId).map((episode) => episode.number));
    expect(getNextEpisodeNumber(demoWorkspace, seriesId)).toBe(highest + 1);
  });

  it("offers only production-context link targets for an asset", () => {
    const asset = demoWorkspace.assets[0];
    const workspace = structuredClone(demoWorkspace);
    workspace.projects.push({ ...workspace.projects[0], id: "other-project", title: "Other project" });
    workspace.series.push({ ...workspace.series[0], id: "other-series", projectId: "other-project", title: "Other series" });
    workspace.episodes.push({ ...workspace.episodes[0], id: "other-episode", seriesId: "other-series", title: "Other episode" });
    const options = getAssetLinkOptions(workspace, asset);

    expect(options).toContainEqual({ targetType: "shot", targetId: "shot-1", label: "Immediate argument" });
    expect(options).toContainEqual({ targetType: "entity", targetId: "entity-maya", label: "Maya" });
    expect(options.every((option) => option.targetId !== "other-episode")).toBe(true);
  });

  it("finds direct and production-linked episode media without duplicates", () => {
    const workspace = structuredClone(demoWorkspace);
    const episode = workspace.episodes[0];
    const generation = workspace.generations[0];
    const generatedAsset = workspace.assets.find((asset) => asset.id === "asset-shot-one")!;
    const directAsset = workspace.assets.find((asset) => asset.id === "asset-fridge-ref")!;

    directAsset.episodeId = episode.id;
    generatedAsset.episodeId = undefined;
    generation.assetIds = [generatedAsset.id];
    workspace.assetLinks.push({
      ...workspace.assetLinks[0],
      id: "generation-result-link",
      assetId: generatedAsset.id,
      targetType: "generation",
      targetId: generation.id,
    });

    const assets = getEpisodeAssets(workspace, episode.id);

    expect(assets.map((asset) => asset.id)).toContain(directAsset.id);
    expect(assets.filter((asset) => asset.id === generatedAsset.id)).toHaveLength(1);
    expect(getEpisodeAssets(workspace, "episode-cart")).toHaveLength(0);
  });

  it("removes an asset and every embedded or explicit reference", () => {
    const cleaned = removeAssetFromWorkspace(demoWorkspace, "asset-shot-one");

    expect(cleaned.assets.some((asset) => asset.id === "asset-shot-one")).toBe(false);
    expect(cleaned.assetLinks.some((link) => link.assetId === "asset-shot-one")).toBe(false);
    expect(cleaned.shots.some((shot) => shot.assetIds.includes("asset-shot-one"))).toBe(false);
    expect(cleaned.generations.some((generation) => generation.assetIds.includes("asset-shot-one"))).toBe(false);
  });

  it.each([
    [20, 60],
    [60, 60],
    [75, 75],
    [90, 90],
    [120, 90],
  ])("builds a balanced sitcom shot plan for a %i-second request", (requested, expected) => {
    const durations = getSitcomShotDurations(requested);
    expect(durations).toHaveLength(5);
    expect(durations.reduce((sum, value) => sum + value, 0)).toBe(expected);
    expect(durations.every((value) => value >= 4)).toBe(true);
  });
});
