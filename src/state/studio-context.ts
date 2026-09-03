import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { GenerationInput } from "../lib/generation-history";
import type { PrepareManagedGenerationInput } from "../lib/managed-generation";
import type { PromptPurpose } from "../lib/prompt-history";
import type { UploadTask } from "../lib/upload-task";
import type {
  Asset,
  AssetKind,
  AssetLink,
  AssetLinkTarget,
  AssetReviewStatus,
  BeatType,
  CostCategory,
  Episode,
  GenerationRecord,
  Platform,
  PromptVersion,
  ProductionEntity,
  Project,
  Publication,
  Scene,
  Series,
  Shot,
  WorkspaceData,
} from "../types";

export type EpisodeDraft = { title: string; idea: string; tags: string; script: string };
export type Notice = { tone: "success" | "error" | "info"; message: string } | null;

export interface StudioContextValue {
  data: WorkspaceData;
  isDemo: boolean;
  session: Session | null;
  user: User | null;
  ownerAuthorized: boolean | null;
  ownerVerificationError: string | null;
  authLoading: boolean;
  dataLoading: boolean;
  notice: Notice;
  clearNotice: () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  retryOwnerVerification: () => void;
  episodeDrafts: Record<string, EpisodeDraft>;
  patchEpisodeDraft: (episodeId: string, patch: Partial<EpisodeDraft>) => void;
  clearEpisodeDraft: (episodeId: string) => void;
  createProject: (input: Pick<Project, "title" | "description" | "accent">) => Project;
  createSeries: (input: Pick<Series, "projectId" | "title" | "premise" | "format" | "orientation" | "targetDurationSeconds">) => Series;
  createEpisode: (seriesId: string, title: string, idea: string) => Episode;
  updateEpisode: (episodeId: string, patch: Partial<Pick<Episode, "title" | "idea" | "status" | "targetDurationSeconds" | "tags">>) => void;
  createEntity: (
    input: Pick<ProductionEntity, "projectId" | "kind" | "name" | "summary" | "promptFragment" | "accent"> & {
      details?: Record<string, string>;
      referenceAssetIds?: string[];
    },
  ) => ProductionEntity;
  updateEntity: (
    entityId: string,
    patch: Partial<
      Pick<ProductionEntity, "name" | "summary" | "promptFragment" | "details" | "accent"> & {
        referenceAssetIds?: string[];
      }
    >,
  ) => void;
  saveScriptVersion: (episodeId: string, content: string, note: string) => void;
  addScene: (episodeId: string, beat: BeatType, title?: string) => Scene;
  addSitcomTemplate: (episodeId: string) => void;
  updateScene: (sceneId: string, patch: Partial<Pick<Scene, "title" | "summary" | "beat" | "locationId" | "position">>) => void;
  moveScene: (sceneId: string, direction: "up" | "down") => void;
  addShot: (sceneId: string, title?: string) => Shot;
  updateShot: (shotId: string, patch: Partial<Shot>) => void;
  moveShot: (shotId: string, direction: "up" | "down") => void;
  uploadTasks: UploadTask[];
  startUpload: (input: { file: File; projectId: string; episodeId?: string; kind: AssetKind }) => string;
  pauseUpload: (taskId: string) => void;
  resumeUpload: (taskId: string) => void;
  retryUpload: (taskId: string) => void;
  cancelUpload: (taskId: string) => Promise<void>;
  dismissUpload: (taskId: string) => void;
  setAssetReview: (assetId: string, status: AssetReviewStatus) => void;
  updateAssetMetadata: (
    assetId: string,
    patch: Partial<Pick<Asset, "notes" | "durationSeconds" | "width" | "height">>,
  ) => void;
  addAssetLink: (assetId: string, targetType: AssetLinkTarget, targetId: string) => AssetLink;
  removeAssetLink: (linkId: string) => Promise<void>;
  trashAsset: (assetId: string) => void;
  restoreAsset: (assetId: string) => void;
  permanentlyDeleteAsset: (assetId: string) => Promise<void>;
  addTimeEntry: (episodeId: string, minutes: number, category: "script" | "storyboard" | "generation" | "editing" | "publishing" | "idea" | "other", note: string) => void;
  addCostEntry: (episodeId: string, amountCents: number, category: CostCategory, provider: string, note: string) => void;
  addPublication: (episodeId: string, platform: Platform, url: string) => Publication;
  addPromptVersion: (episodeId: string, purpose: PromptPurpose, content: string, shotId?: string) => PromptVersion;
  addGeneration: (input: GenerationInput) => GenerationRecord;
  simulateGeneration: (input: PrepareManagedGenerationInput) => Promise<string>;
  cancelManagedGeneration: (generationId: string) => Promise<void>;
  resolveUnknownSubmission: (
    generationId: string,
    outcome: "no_charge" | "confirmed_charge",
    confirmedCostMicros?: number,
  ) => void;
  linkGenerationAsset: (generationId: string, assetId: string) => AssetLink;
  unlinkGenerationAsset: (generationId: string, assetId: string) => Promise<void>;
  setGenerationOutcome: (generationId: string, outcome: AssetReviewStatus) => void;
  quickCapture: (text: string) => void;
  convertCaptureToEpisode: (captureId: string, seriesId: string) => void;
  archiveProject: (projectId: string) => void;
  resetDemo: () => void;
  exportWorkspace: () => void;
  importWorkspace: (file: File) => Promise<void>;
}

export const StudioContext = createContext<StudioContextValue | null>(null);
