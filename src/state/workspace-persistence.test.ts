import { beforeEach, describe, expect, it } from 'vitest';
import { demoWorkspace } from '../data/demo';
import {
  loadDemo,
  parseWorkspaceExport,
  saveDemo,
  workspaceCollectionKeys,
} from './workspace-persistence';

beforeEach(() => localStorage.clear());

describe('workspace persistence', () => {
  it('round-trips the fictional workspace through local storage', () => {
    saveDemo(demoWorkspace);
    expect(loadDemo()).toEqual(demoWorkspace);
  });

  it('falls back to a fresh fictional workspace when saved JSON is invalid', () => {
    localStorage.setItem('studioflow-demo-workspace-v1', 'not-json');
    expect(loadDemo()).toEqual(demoWorkspace);
  });

  it('normalizes legacy exports and preserves unknown record fields', () => {
    const legacy = structuredClone(demoWorkspace) as unknown as Record<string, unknown>;
    delete legacy.assetLinks;
    delete legacy.generationInputs;
    delete legacy.generationEvents;
    delete legacy.generationBudgetSettings;
    const generations = legacy.generations as Array<Record<string, unknown>>;
    for (const generation of generations) {
      delete generation.executionMode;
      delete generation.operationalStatus;
      delete generation.requestSettings;
      delete generation.estimatedCostMicros;
      delete generation.reservedMaxCostMicros;
      delete generation.pricingSnapshot;
      delete generation.estimatedOutputBytes;
      delete generation.reservedOutputBytes;
      delete generation.pollAttempts;
      delete generation.ingestAttempts;
    }
    const projects = legacy.projects as Array<Record<string, unknown>>;
    projects[0].futureField = 'keep me';

    const restored = parseWorkspaceExport(legacy, 'replacement-owner');
    expect(restored.assetLinks).toEqual([]);
    expect(restored.generationInputs).toEqual([]);
    expect(restored.generationEvents).toEqual([]);
    expect(restored.generationBudgetSettings).toHaveLength(1);
    expect(restored.generationBudgetSettings[0].generationEnabled).toBe(false);
    expect(restored.generations[0]).toMatchObject({
      executionMode: 'manual',
      operationalStatus: 'recorded',
    });
    expect(restored.projects[0]).toMatchObject({
      ownerId: 'replacement-owner',
      futureField: 'keep me',
    });
    for (const key of workspaceCollectionKeys) {
      expect(restored[key].every((record) => record.ownerId === 'replacement-owner')).toBe(true);
    }
  });

  it('restores generation targets before their polymorphic asset links', () => {
    expect(workspaceCollectionKeys.indexOf('generations')).toBeLessThan(
      workspaceCollectionKeys.indexOf('assetLinks')
    );
    expect(workspaceCollectionKeys.indexOf('generations')).toBeLessThan(
      workspaceCollectionKeys.indexOf('generationInputs')
    );
    expect(workspaceCollectionKeys.indexOf('generationInputs')).toBeLessThan(
      workspaceCollectionKeys.indexOf('assetLinks')
    );
  });
});
