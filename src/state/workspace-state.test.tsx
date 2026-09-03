import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoWorkspace } from '../data/demo';
import { useWorkspaceState } from './workspace-state';

describe('useWorkspaceState', () => {
  it('keeps synchronous commands on the latest workspace value', () => {
    const { result } = renderHook(() => useWorkspaceState(() => structuredClone(demoWorkspace)));

    act(() => {
      result.current.setData((current) => ({ ...current, version: 2 }));
      result.current.setData((current) => ({ ...current, version: current.version + 1 }));
    });

    expect(result.current.data.version).toBe(3);
    expect(result.current.getData().version).toBe(3);
  });
});
