import type { ProductionEntity, WorkspaceData } from '../types';

function memoryLine(entity: ProductionEntity): string {
  const guidance = entity.promptFragment.trim() || entity.summary.trim();
  return guidance ? `${entity.name}: ${guidance}` : entity.name;
}

function section(title: string, values: Array<string | undefined>): string | null {
  const content = values.map((value) => value?.trim()).filter(Boolean);
  return content.length ? `${title}:\n${content.join('\n')}` : null;
}

export function compileShotPrompt(
  workspace: WorkspaceData,
  episodeId: string,
  shotId: string
): string {
  const episode = workspace.episodes.find((item) => item.id === episodeId);
  const shot = workspace.shots.find((item) => item.id === shotId);
  const scene = shot ? workspace.scenes.find((item) => item.id === shot.sceneId) : undefined;
  const series = episode ? workspace.series.find((item) => item.id === episode.seriesId) : undefined;
  const project = series
    ? workspace.projects.find((item) => item.id === series.projectId)
    : undefined;

  if (!episode || !shot || !scene || !series || !project || scene.episodeId !== episode.id) {
    throw new Error('Choose a shot from this episode before preparing generation.');
  }

  const projectEntities = workspace.entities.filter(
    (entity) =>
      entity.projectId === project.id && !entity.archivedAt && !entity.deletedAt
  );
  const shotText = [shot.title, shot.action, shot.dialogue, shot.prompt, scene.title, scene.summary]
    .join(' ')
    .toLocaleLowerCase();
  const characters = projectEntities.filter(
    (entity) =>
      entity.kind === 'character' &&
      (shot.characterIds.includes(entity.id) || shotText.includes(entity.name.toLocaleLowerCase()))
  );
  const locations = projectEntities.filter(
    (entity) =>
      entity.kind === 'location' &&
      (scene.locationId === entity.id || shotText.includes(entity.name.toLocaleLowerCase()))
  );
  const props = projectEntities.filter(
    (entity) => entity.kind === 'prop' && shotText.includes(entity.name.toLocaleLowerCase())
  );
  const styles = projectEntities.filter((entity) => entity.kind === 'style');

  return [
    section('Series', [
      `${series.title} · ${series.orientation} · ${series.targetDurationSeconds}-second target`,
      series.premise,
    ]),
    section('Episode', [episode.title, episode.idea]),
    section('Scene', [`${scene.beat}: ${scene.title}`, scene.summary]),
    section('Shot', [
      `Title: ${shot.title}`,
      `Framing: ${shot.framing}`,
      `Duration: ${shot.durationSeconds} seconds`,
      shot.action ? `Action: ${shot.action}` : undefined,
      shot.dialogue ? `Dialogue: ${shot.dialogue}` : undefined,
      shot.prompt ? `Working direction: ${shot.prompt}` : undefined,
    ]),
    section('Character memory', characters.map(memoryLine)),
    section('Location memory', locations.map(memoryLine)),
    section('Prop memory', props.map(memoryLine)),
    section('Style memory', styles.map(memoryLine)),
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n\n');
}
