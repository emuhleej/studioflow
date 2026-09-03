import { useMemo, useState, type FormEvent } from 'react';
import { Box, Image, MapPin, Palette, Plus, Search, Sparkles, UserRound } from 'lucide-react';
import { Button, EmptyState, Field, Modal, PageHeading, SubmitButton } from '../components/ui';
import { entityKinds, useStudio } from '../state/studio-store';
import type { Asset, EntityKind, ProductionEntity } from '../types';
import { titleCase } from '../lib/format';

const icons: Record<EntityKind, typeof UserRound> = {
  character: UserRound,
  location: MapPin,
  prop: Box,
  style: Palette,
};
const accents: Record<EntityKind, string> = {
  character: '#c9a7ff',
  location: '#efbd72',
  prop: '#a9b7ca',
  style: '#71d4b3',
};

const detailTemplateByKind: Record<EntityKind, string[]> = {
  character: ['Appearance', 'Wardrobe', 'Voice', 'Personality'],
  location: ['Lighting', 'Palette', 'Props Placement', 'Wardrobe Notes'],
  prop: ['Material', 'Scale', 'Color', 'Function'],
  style: ['Camera', 'Color Grade', 'Pacing', 'Composition'],
};

const buildDetails = (kind: EntityKind) =>
  Object.fromEntries(detailTemplateByKind[kind].map((field) => [field, '']));

function isSelected(selected: string[], id: string) {
  return selected.includes(id);
}

function pickProjectReferenceImages(assets: Asset[], projectId?: string) {
  return assets.filter(
    (asset) =>
      !asset.deletedAt && asset.kind === 'image' && (!projectId || asset.projectId === projectId)
  );
}

export function LibraryPage() {
  const { data, createEntity, updateEntity } = useStudio();
  const [kind, setKind] = useState<EntityKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<ProductionEntity | null>(null);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [prompt, setPrompt] = useState('');
  const [newKind, setNewKind] = useState<EntityKind>('character');
  const [createDetails, setCreateDetails] = useState<Record<string, string>>(
    buildDetails('character')
  );
  const [createReferenceAssetIds, setCreateReferenceAssetIds] = useState<string[]>([]);
  const project = data.projects.find((item) => !item.archivedAt);
  const projectAssets = useMemo(
    () => pickProjectReferenceImages(data.assets, project?.id),
    [data.assets, project?.id]
  );
  const filtered = useMemo(
    () =>
      data.entities.filter((entity) => {
        const kindMatch = kind === 'all' || entity.kind === kind;
        const text = `${entity.name} ${entity.summary} ${entity.promptFragment}`.toLowerCase();
        return kindMatch && text.includes(query.toLowerCase());
      }),
    [data.entities, kind, query]
  );

  const startCreate = () => {
    setName('');
    setSummary('');
    setPrompt('');
    setCreateDetails(buildDetails(newKind));
    setCreateReferenceAssetIds([]);
    setCreateOpen(true);
  };

  const setSelectedReference = (assetId: string) => {
    if (!selected) return;
    setSelected({
      ...selected,
      referenceAssetIds: isSelected(selected.referenceAssetIds, assetId)
        ? selected.referenceAssetIds.filter((item) => item !== assetId)
        : [...selected.referenceAssetIds, assetId],
    });
  };

  const toggleReferenceForCreate = (assetId: string) => {
    setCreateReferenceAssetIds((current) =>
      isSelected(current, assetId)
        ? current.filter((item) => item !== assetId)
        : [...current, assetId]
    );
  };

  const updateCreateDetail = (field: string, value: string) =>
    setCreateDetails((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project || !name.trim()) return;
    createEntity({
      projectId: project.id,
      kind: newKind,
      name: name.trim(),
      summary: summary.trim(),
      promptFragment: prompt.trim(),
      details: createDetails,
      referenceAssetIds: createReferenceAssetIds,
      accent: accents[newKind],
    });
    setName('');
    setSummary('');
    setPrompt('');
    setCreateReferenceAssetIds([]);
    setCreateOpen(false);
  };

  const saveSelected = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    updateEntity(selected.id, {
      name: selected.name,
      summary: selected.summary,
      promptFragment: selected.promptFragment,
      details: selected.details,
      referenceAssetIds: selected.referenceAssetIds,
    });
    setSelected(null);
  };

  return (
    <div>
      <PageHeading
        eyebrow="Production memory"
        title="Make consistency reusable."
        description="Characters, locations, props, and visual styles carry their defining details and prompt fragments from episode to episode."
        actions={
          <Button variant="primary" onClick={startCreate} disabled={!project}>
            <Plus size={16} />
            New memory
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="tabs" role="tablist" aria-label="Memory type">
          {(['all', ...entityKinds] as const).map((item) => (
            <button
              key={item}
              className="tab"
              aria-selected={kind === item}
              onClick={() => setKind(item)}
            >
              {titleCase(item)}
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-3.5 text-[var(--quiet)]"
          />
          <span className="sr-only">Search production memory</span>
          <input
            className="input !pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search memory…"
          />
        </label>
      </div>
      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entity) => {
            const Icon = icons[entity.kind];
            const referenceCount = entity.referenceAssetIds.filter((id) =>
              projectAssets.some((asset) => asset.id === id)
            ).length;
            return (
              <button
                key={entity.id}
                onClick={() => setSelected(structuredClone(entity))}
                className="panel p-0 text-left transition hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{ color: entity.accent, background: `${entity.accent}18` }}
                  >
                    <Icon size={20} />
                  </div>
                  <span className="badge">{titleCase(entity.kind)}</span>
                </div>
                <div className="px-4 pb-4">
                  <h2 className="text-lg font-semibold tracking-tight">{entity.name}</h2>
                  <p className="muted mt-2 min-h-15 text-sm leading-5">
                    {entity.summary || 'No summary yet.'}
                  </p>
                  <div className="mt-4 rounded-xl border border-[var(--line)] bg-black/10 p-3">
                    <div className="quiet mb-1 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider">
                      <Sparkles size={12} />
                      Prompt fragment
                    </div>
                    <p className="text-xs leading-5 text-[#c7cbd3]">
                      {entity.promptFragment || 'Add a reusable consistency prompt.'}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-[var(--quiet)]">
                    <div className="flex items-center gap-2">
                      <Image size={14} />
                      {referenceCount
                        ? `${referenceCount} image reference${referenceCount > 1 ? 's' : ''}`
                        : 'No reference images yet'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            icon={<Sparkles size={28} />}
            title="No matching production memory"
            description="Add a recurring character, location, prop, or style—or clear the active filter."
            action={
              <Button variant="primary" onClick={startCreate} disabled={!project}>
                <Plus size={16} />
                New memory
              </Button>
            }
          />
        </section>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add production memory"
        description="Start with the details that must stay visually consistent across episodes; expand them as needed."
      >
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Type">
            <select
              className="select"
              value={newKind}
              onChange={(event) => {
                const nextKind = event.target.value as EntityKind;
                setNewKind(nextKind);
                setCreateDetails(buildDetails(nextKind));
                setCreateReferenceAssetIds([]);
              }}
            >
              {entityKinds.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input
              autoFocus
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
          <Field label="Summary">
            <textarea
              className="textarea"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </Field>
          <Field label="Reusable prompt fragment">
            <textarea
              className="textarea"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="The minimum words that keep this memory consistent."
            />
          </Field>
          <div>
            <div className="field-label mb-2">Structured details</div>
            <div className="grid gap-2">
              {Object.entries(createDetails).map(([key, value]) => (
                <div key={`${newKind}-${key}`} className="grid grid-cols-[130px_1fr] gap-2">
                  <input className="input" value={key} disabled />
                  <textarea
                    className="textarea min-h-[44px]"
                    value={value}
                    onChange={(event) => updateCreateDetail(key, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="field-label mb-2 flex items-center gap-2">
              <Image size={14} />
              Reference image assets
            </div>
            {projectAssets.length ? (
              <div className="grid max-h-64 gap-2 overflow-auto rounded-xl border border-[var(--line)] p-2">
                {projectAssets.map((asset) => (
                  <label
                    key={asset.id}
                    className="grid grid-cols-[20px_1fr] items-center gap-2 rounded-lg border border-[var(--line)] p-2"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected(createReferenceAssetIds, asset.id)}
                      onChange={() => toggleReferenceForCreate(asset.id)}
                    />
                    <span className="truncate text-sm">{asset.filename}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="muted text-sm">Upload image assets in Media to use as references.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>Add memory</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? 'Memory detail'}
        description={selected ? titleCase(selected.kind) : undefined}
      >
        {selected ? (
          <form className="grid gap-4" onSubmit={saveSelected}>
            <Field label="Name">
              <input
                className="input"
                value={selected.name}
                onChange={(event) => setSelected({ ...selected, name: event.target.value })}
              />
            </Field>
            <Field label="Summary">
              <textarea
                className="textarea"
                value={selected.summary}
                onChange={(event) => setSelected({ ...selected, summary: event.target.value })}
              />
            </Field>
            <Field label="Prompt fragment">
              <textarea
                className="textarea"
                value={selected.promptFragment}
                onChange={(event) =>
                  setSelected({ ...selected, promptFragment: event.target.value })
                }
              />
            </Field>
            <div>
              <div className="field-label mb-2">Structured details</div>
              <div className="grid gap-2">
                {Object.entries(selected.details).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[130px_1fr] gap-2">
                    <input className="input" value={key} disabled />
                    <textarea
                      className="textarea min-h-[44px]"
                      value={value}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          details: { ...selected.details, [key]: event.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label mb-2 flex items-center gap-2">
                <Image size={14} />
                Reference image assets
              </div>
              <div className="grid gap-2">
                {projectAssets.length ? (
                  projectAssets.map((asset) => (
                    <label
                      key={asset.id}
                      className="grid grid-cols-[20px_1fr] items-center gap-2 rounded-lg border border-[var(--line)] p-2"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected(selected.referenceAssetIds, asset.id)}
                        onChange={() => setSelectedReference(asset.id)}
                      />
                      <span className="truncate text-sm">{asset.filename}</span>
                    </label>
                  ))
                ) : (
                  <p className="muted text-sm">
                    Upload image assets in Media to use as references.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <SubmitButton>Save memory</SubmitButton>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
