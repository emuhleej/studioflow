// Schema snapshot for type-safe Supabase work. Regenerate after every migration with `npm run supabase:types`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface BaseRow {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
}

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

interface ProjectRow extends BaseRow { title: string; description: string; accent: string }
interface SeriesRow extends BaseRow { project_id: string; title: string; premise: string; format: "short_series" | "long_form" | "campaign" | "other"; orientation: "9:16" | "16:9" | "1:1"; target_duration_seconds: number }
interface EpisodeRow extends BaseRow { series_id: string; number: number; title: string; idea: string; status: Database["public"]["Enums"]["episode_status"]; target_duration_seconds: number; tags: string[] }
interface ScriptVersionRow extends BaseRow { episode_id: string; version: number; title: string; content: string; note: string }
interface SceneRow extends BaseRow { episode_id: string; title: string; beat: Database["public"]["Enums"]["beat_type"]; summary: string; position: number; location_id: string | null }
interface ShotRow extends BaseRow { scene_id: string; title: string; position: number; duration_seconds: number; framing: string; action: string; dialogue: string; prompt: string; status: "planned" | "generated" | "selected"; character_ids: string[]; asset_ids: string[] }
interface EntityRow extends BaseRow { project_id: string; kind: Database["public"]["Enums"]["entity_kind"]; name: string; summary: string; details: Json; prompt_fragment: string; reference_asset_ids: string[]; accent: string }
interface AssetRow extends BaseRow { project_id: string; episode_id: string | null; kind: Database["public"]["Enums"]["asset_kind"]; filename: string; mime_type: string; bytes: number; duration_seconds: number | null; width: number | null; height: number | null; storage_key: string; review_status: Database["public"]["Enums"]["asset_review_status"]; source: "upload" | "generation" | "demo"; notes: string }
interface AssetLinkRow extends BaseRow { asset_id: string; target_type: "project" | "series" | "episode" | "scene" | "shot" | "entity" | "generation"; target_id: string }
interface UploadSessionRow extends BaseRow { asset_id: string; upload_id: string | null; mode: "single" | "multipart"; part_size: number | null; state: "started" | "uploading" | "completed" | "cancelled" | "failed"; completed_parts: Json; expires_at: string; completed_at: string | null }
interface PromptVersionRow extends BaseRow { episode_id: string; shot_id: string | null; version: number; purpose: "image" | "video" | "voice" | "script" | "other"; content: string }
interface GenerationRecordRow extends BaseRow { episode_id: string; shot_id: string | null; prompt_version_id: string | null; provider: string; model: string; cost_cents: number; duration_seconds: number | null; outcome: Database["public"]["Enums"]["asset_review_status"]; asset_ids: string[]; notes: string }
interface TimeEntryRow extends BaseRow { episode_id: string; category: "idea" | "script" | "storyboard" | "generation" | "editing" | "publishing" | "other"; minutes: number; note: string; occurred_on: string }
interface CostEntryRow extends BaseRow { episode_id: string; category: Database["public"]["Enums"]["cost_category"]; amount_cents: number; provider: string; note: string; occurred_on: string }
interface PublicationRow extends BaseRow { episode_id: string; platform: Database["public"]["Enums"]["platform_name"]; url: string; published_at: string; views: number | null }
interface CaptureRow extends BaseRow { text: string; converted_to_episode_id: string | null }
interface AppOwnerRow { user_id: string; created_at: string }
interface BackupRunRow { id: string; owner_id: string; storage_key: string; bytes: number; status: "completed" | "failed"; created_at: string }
interface ErrorEventRow { id: string; owner_id: string; message: string; context: string; path: string; user_agent: string; created_at: string }

export interface Database {
  public: {
    Tables: {
      app_owners: Table<AppOwnerRow>;
      projects: Table<ProjectRow>;
      series: Table<SeriesRow>;
      episodes: Table<EpisodeRow>;
      script_versions: Table<ScriptVersionRow>;
      scenes: Table<SceneRow>;
      shots: Table<ShotRow>;
      entities: Table<EntityRow>;
      assets: Table<AssetRow>;
      asset_links: Table<AssetLinkRow>;
      upload_sessions: Table<UploadSessionRow>;
      prompt_versions: Table<PromptVersionRow>;
      generation_records: Table<GenerationRecordRow>;
      time_entries: Table<TimeEntryRow>;
      cost_entries: Table<CostEntryRow>;
      publications: Table<PublicationRow>;
      captures: Table<CaptureRow>;
      backup_runs: Table<BackupRunRow>;
      error_events: Table<ErrorEventRow>;
    };
    Views: Record<string, never>;
    Functions: {
      is_app_owner: { Args: { candidate?: string }; Returns: boolean };
    };
    Enums: {
      episode_status: "idea" | "scripting" | "shot_planning" | "generating" | "editing" | "ready" | "published" | "archived";
      beat_type: "hook" | "setup" | "escalation" | "payoff" | "tag" | "custom";
      entity_kind: "character" | "location" | "prop" | "style";
      asset_kind: "image" | "audio" | "video";
      asset_review_status: "unreviewed" | "selected" | "rejected";
      cost_category: "image" | "video" | "voice" | "music" | "editing" | "other";
      platform_name: "tiktok" | "youtube" | "facebook" | "instagram";
    };
    CompositeTypes: Record<string, never>;
  };
}
