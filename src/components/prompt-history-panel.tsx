import { useMemo, useState, type FormEvent } from 'react';
import { Copy, CopyPlus } from 'lucide-react';
import { formatShortDate, titleCase } from '../lib/format';
import {
  getEpisodePromptHistory,
  validatePromptContent,
  type PromptPurpose,
} from '../lib/prompt-history';
import { useStudio } from '../state/studio-store';
import { Button, EmptyState, Field } from './ui';

const purposes: PromptPurpose[] = ['video', 'image', 'voice', 'script', 'other'];

export function PromptHistoryPanel({ episodeId }: { episodeId: string }) {
  const { data, addPromptVersion } = useStudio();
  const [purpose, setPurpose] = useState<PromptPurpose>('video');
  const [shotId, setShotId] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const episodeScenes = useMemo(
    () =>
      data.scenes
        .filter((scene) => scene.episodeId === episodeId)
        .sort((left, right) => left.position - right.position),
    [data.scenes, episodeId]
  );
  const scenePositions = useMemo(
    () => new Map(episodeScenes.map((scene, index) => [scene.id, index])),
    [episodeScenes]
  );
  const shots = useMemo(
    () =>
      data.shots
        .filter((shot) => scenePositions.has(shot.sceneId))
        .sort(
          (left, right) =>
            (scenePositions.get(left.sceneId) ?? 0) - (scenePositions.get(right.sceneId) ?? 0) ||
            left.position - right.position
        ),
    [data.shots, scenePositions]
  );
  const shotsById = useMemo(() => new Map(shots.map((shot) => [shot.id, shot])), [shots]);
  const prompts = useMemo(
    () => getEpisodePromptHistory(data.prompts, episodeId),
    [data.prompts, episodeId]
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validatePromptContent(content);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    try {
      const prompt = addPromptVersion(episodeId, purpose, content, shotId || undefined);
      setContent('');
      setError('');
      setMessage(`Saved ${titleCase(prompt.purpose)} version ${prompt.version}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prompt version could not be saved.');
      setMessage('');
    }
  };

  return (
    <section className="panel panel-pad">
      <div className="eyebrow">Prompt history</div>
      <h2 className="section-title mt-1">Preserve what you tried</h2>
      <p className="muted mt-2 text-xs leading-5">
        Every save creates a new immutable version. Older versions stay available for reference.
      </p>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Purpose">
            <select
              className="select"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value as PromptPurpose)}
            >
              {purposes.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Shot">
            <select
              className="select"
              value={shotId}
              onChange={(event) => setShotId(event.target.value)}
            >
              <option value="">Episode-wide</option>
              {shots.map((shot) => (
                <option key={shot.id} value={shot.id}>
                  {shot.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Prompt">
          <textarea
            className="textarea min-h-40"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Record the exact prompt before the next iteration changes it."
          />
        </Field>
        {error ? (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="text-xs text-[var(--mint)]">
            {message}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button variant="primary" type="submit">
            <CopyPlus size={16} />
            Save prompt version
          </Button>
        </div>
      </form>

      {prompts.length ? (
        <div className="mt-5 grid gap-2">
          {prompts.map((prompt) => (
            <article
              key={prompt.id}
              className="rounded-xl border border-[var(--line)] bg-black/10 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge">
                    {titleCase(prompt.purpose)} · v{prompt.version}
                  </span>
                  <span className="quiet text-[0.65rem]">
                    {prompt.shotId
                      ? (shotsById.get(prompt.shotId)?.title ?? 'Unknown shot')
                      : 'Episode-wide'}
                  </span>
                </div>
                <span className="quiet text-[0.65rem]">{formatShortDate(prompt.createdAt)}</span>
              </div>
              <p className="muted mt-3 whitespace-pre-wrap text-xs leading-5">{prompt.content}</p>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPurpose(prompt.purpose);
                    setShotId(prompt.shotId ?? '');
                    setContent(prompt.content);
                    setError('');
                    setMessage('Copied to a new draft. Saving will create another version.');
                  }}
                >
                  <Copy size={14} />
                  Use as next draft
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CopyPlus />}
          title="No prompt versions yet"
          description="Save the first exact prompt for this episode or one of its shots."
        />
      )}
    </section>
  );
}
