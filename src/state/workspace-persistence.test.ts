import { beforeEach, describe, expect, it } from "vitest";
import { demoWorkspace } from "../data/demo";
import { loadDemo, parseWorkspaceExport, saveDemo, workspaceCollectionKeys } from "./workspace-persistence";

beforeEach(() => localStorage.clear());

describe("workspace persistence", () => {
  it("round-trips the fictional workspace through local storage", () => {
    saveDemo(demoWorkspace);
    expect(loadDemo()).toEqual(demoWorkspace);
  });

  it("falls back to a fresh fictional workspace when saved JSON is invalid", () => {
    localStorage.setItem("studioflow-demo-workspace-v1", "not-json");
    expect(loadDemo()).toEqual(demoWorkspace);
  });

  it("normalizes legacy exports and preserves unknown record fields", () => {
    const legacy = structuredClone(demoWorkspace) as unknown as Record<string, unknown>;
    delete legacy.assetLinks;
    const projects = legacy.projects as Array<Record<string, unknown>>;
    projects[0].futureField = "keep me";

    const restored = parseWorkspaceExport(legacy, "replacement-owner");
    expect(restored.assetLinks).toEqual([]);
    expect(restored.projects[0]).toMatchObject({ ownerId: "replacement-owner", futureField: "keep me" });
    for (const key of workspaceCollectionKeys) {
      expect(restored[key].every((record) => record.ownerId === "replacement-owner")).toBe(true);
    }
  });
});
