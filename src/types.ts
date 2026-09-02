export type Id = string;

export type EpisodeStatus =
  | "idea"
  | "scripting"
  | "shot_planning"
  | "generating"
  | "editing"
  | "ready"
  | "published"
  | "archived";

export type BeatType = "hook" | "setup" | "escalation" | "payoff" | "tag" | "custom";
export type AssetKind = "image" | "audio" | "video";
export type AssetReviewStatus = "unreviewed" | "selected" | "rejected";
export type CostCategory = "image" | "video" | "voice" | "music" | "editing" | "other";
export type EntityKind = "character" | "location" | "prop" | "style";
export type Platform = "tiktok" | "youtube" | "facebook" | "instagram";
export type AssetLinkTarget = "project" | "series" | "episode" | "scene" | "shot" | "entity" | "generation";

export interface BaseRecord {
  id: Id;
  ownerId: Id;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  deletedAt?: string;
}

export interface Project extends BaseRecord {
  title: string;
  description: string;
  accent: string;
}

export interface Series extends BaseRecord {
  projectId: Id;
  title: string;
  premise: string;
  format: "short_series" | "long_form" | "campaign" | "other";
  orientation: "9:16" | "16:9" | "1:1";
  targetDurationSeconds: number;
}

export interface Episode extends BaseRecord {
  seriesId: Id;
  number: number;
  title: string;
  idea: string;
  status: EpisodeStatus;
  targetDurationSeconds: number;
  tags: string[];
}

export interface ScriptVersion extends BaseRecord {
  episodeId: Id;
  version: number;
  title: string;
  content: string;
  note: string;
}

export interface Scene extends BaseRecord {
  episodeId: Id;
  title: string;
  beat: BeatType;
  summary: string;
  position: number;
  locationId?: Id;
}

export interface Shot extends BaseRecord {
  sceneId: Id;
  title: string;
  position: number;
  durationSeconds: number;
  framing: string;
  action: string;
  dialogue: string;
  prompt: string;
  status: "planned" | "generated" | "selected";
  characterIds: Id[];
  assetIds: Id[];
}

export interface ProductionEntity extends BaseRecord {
  projectId: Id;
  kind: EntityKind;
  name: string;
  summary: string;
  details: Record<string, string>;
  promptFragment: string;
  referenceAssetIds: Id[];
  accent: string;
}

export interface Asset extends BaseRecord {
  projectId: Id;
  episodeId?: Id;
  kind: AssetKind;
  filename: string;
  mimeType: string;
  bytes: number;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  storageKey: string;
  reviewStatus: AssetReviewStatus;
  source: "upload" | "generation" | "demo";
  notes: string;
}

export interface AssetLink extends BaseRecord {
  assetId: Id;
  targetType: AssetLinkTarget;
  targetId: Id;
}

export interface PromptVersion extends BaseRecord {
  episodeId: Id;
  shotId?: Id;
  version: number;
  purpose: "image" | "video" | "voice" | "script" | "other";
  content: string;
}

export interface GenerationRecord extends BaseRecord {
  episodeId: Id;
  shotId?: Id;
  promptVersionId?: Id;
  provider: string;
  model: string;
  costCents: number;
  durationSeconds?: number;
  outcome: AssetReviewStatus;
  assetIds: Id[];
  notes: string;
}

export interface TimeEntry extends BaseRecord {
  episodeId: Id;
  category: "idea" | "script" | "storyboard" | "generation" | "editing" | "publishing" | "other";
  minutes: number;
  note: string;
  occurredOn: string;
}

export interface CostEntry extends BaseRecord {
  episodeId: Id;
  category: CostCategory;
  amountCents: number;
  provider: string;
  note: string;
  occurredOn: string;
}

export interface Publication extends BaseRecord {
  episodeId: Id;
  platform: Platform;
  url: string;
  publishedAt: string;
  views?: number;
}

export interface Capture extends BaseRecord {
  text: string;
  convertedToEpisodeId?: Id;
}

export interface WorkspaceData {
  version: number;
  ownerId: Id;
  projects: Project[];
  series: Series[];
  episodes: Episode[];
  scripts: ScriptVersion[];
  scenes: Scene[];
  shots: Shot[];
  entities: ProductionEntity[];
  assets: Asset[];
  assetLinks: AssetLink[];
  prompts: PromptVersion[];
  generations: GenerationRecord[];
  timeEntries: TimeEntry[];
  costEntries: CostEntry[];
  publications: Publication[];
  captures: Capture[];
}

export interface EpisodeTotals {
  durationSeconds: number;
  productionMinutes: number;
  costCents: number;
}
