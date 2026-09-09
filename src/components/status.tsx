import type { EpisodeStatus } from '../types';
import { titleCase } from '../lib/format';

const colors: Record<EpisodeStatus, string> = {
  idea: '#aab0bb',
  scripting: '#c5a6f4',
  shot_planning: '#efbd72',
  generating: '#73c9e7',
  editing: '#e98aa1',
  ready: '#71d4b3',
  published: '#9de17a',
  archived: '#737b88',
};

export function StatusBadge({ status }: { status: EpisodeStatus }) {
  return (
    <span className="badge" style={{ color: colors[status], borderColor: `${colors[status]}40` }}>
      <span className="status-dot" />
      {titleCase(status)}
    </span>
  );
}
