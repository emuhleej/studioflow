import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { WorkspaceData } from '../types';

export function useWorkspaceState(initializer: () => WorkspaceData): {
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  getData: () => WorkspaceData;
} {
  const [data, setReactData] = useState(initializer);
  const dataRef = useRef(data);

  const setData = useCallback<Dispatch<SetStateAction<WorkspaceData>>>((update) => {
    const next = typeof update === 'function' ? update(dataRef.current) : update;
    dataRef.current = next;
    setReactData(next);
  }, []);

  const getData = useCallback(() => dataRef.current, []);
  return { data, setData, getData };
}
