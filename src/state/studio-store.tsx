import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getAssetLinkOptions, getNextEpisodeNumber, getSitcomShotDurations, removeAssetFromWorkspace } from "../lib/domain";
import { validateGenerationAssetLink, validateGenerationInput, validateGenerationOutcome } from "../lib/generation-history";
import { deleteAssetBlob } from "../lib/blob-store";
import { deleteRemoteAsset } from "../lib/media-upload";
import { loadRemoteWorkspace, permanentlyDeleteRemoteRecord, upsertRemoteRecord } from "../lib/remote-repository";
import { getNextPromptVersion, validatePromptContent } from "../lib/prompt-history";
import { signInWithGitHub, signOut, supabase } from "../lib/supabase";
import type {
  AssetLink,
  BaseRecord,
  BeatType,
  Episode,
  EpisodeStatus,
  EntityKind,
  GenerationRecord,
  PromptVersion,
  ProductionEntity,
  Project,
  Publication,
  Scene,
  Series,
  Shot,
  WorkspaceData,
} from "../types";
import { rollbackAppendedRecord, rollbackUpdatedRecord, saveWithRetry } from "./cloud-save";
import { StudioContext, type EpisodeDraft, type Notice, type StudioContextValue } from "./studio-context";
import { useUploadManager } from "./use-upload-manager";
import { isOwnerWorkspaceLoading, useOwnerAuthorization } from "./use-owner-authorization";
import {
  createBaseRecord,
  demoMode,
  freshDemo,
  loadDemo,
  loadEpisodeDrafts,
  now,
  parseWorkspaceExport,
  saveDemo,
  saveEpisodeDrafts,
  workspaceCollectionKeys,
} from "./workspace-persistence";
import { useWorkspaceState } from "./workspace-state";

type WorkspaceArrayKey = Parameters<typeof upsertRemoteRecord>[0];

function replaceCollection(workspace: WorkspaceData, key: WorkspaceArrayKey, records: BaseRecord[]): WorkspaceData {
  return { ...workspace, [key]: records } as WorkspaceData;
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const { data, setData, getData } = useWorkspaceState(() => (demoMode ? loadDemo() : freshDemo()));
  const [episodeDrafts, setEpisodeDrafts] = useState<Record<string, EpisodeDraft>>(() => loadEpisodeDrafts());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!demoMode);
  const [settledWorkspaceSessionKey, setSettledWorkspaceSessionKey] = useState<string | null>(demoMode ? "demo" : null);
  const [notice, setNotice] = useState<Notice>(null);

  const user = session?.user ?? null;

  useEffect(() => {
    if (demoMode || !supabase) return;
    let disposed = false;
    let authEventReceived = false;
    const applySession = (nextSession: Session | null) => {
      if (disposed) return;
      setSession((current) => current?.access_token === nextSession?.access_token ? current : nextSession);
      setAuthLoading(false);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      applySession(nextSession);
    });
    void supabase.auth.getSession().then(({ data: authData, error }) => {
      if (disposed || authEventReceived) return;
      if (error) {
        setNotice({ tone: "error", message: `Sign-in session could not load: ${error.message}` });
        applySession(null);
        return;
      }
      applySession(authData.session);
    });
    return () => {
      disposed = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const verifyOwner = useCallback(async () => {
    if (!supabase) return { data: null, error: { message: "Supabase is not configured." } };
    const response = await supabase.rpc("current_user_is_app_owner");
    return { data: response.data, error: response.error, status: response.status };
  }, []);

  const stabilizeSession = useCallback(async () => {
    if (!supabase) return false;
    const { data: authData, error } = await supabase.auth.getSession();
    if (error) throw error;
    return Boolean(authData.session?.access_token);
  }, []);

  const { state: ownerAuthorization, retry: retryOwnerVerification } = useOwnerAuthorization({
    enabled: !demoMode && Boolean(user),
    sessionKey: demoMode ? null : session?.access_token ?? null,
    verify: verifyOwner,
    stabilizeSession,
  });
  const ownerAuthorized = demoMode || ownerAuthorization.status === "allowed"
    ? true
    : ownerAuthorization.status === "denied"
      ? false
      : null;
  const ownerVerificationError = ownerAuthorization.status === "error" ? ownerAuthorization.message : null;
  const activeSessionKey = demoMode ? null : session?.access_token ?? null;
  const dataLoading = isOwnerWorkspaceLoading(
    demoMode,
    ownerAuthorization,
    activeSessionKey,
    settledWorkspaceSessionKey,
  );

  useEffect(() => {
    if (demoMode) saveDemo(data);
  }, [data]);

  useEffect(() => {
    saveEpisodeDrafts(episodeDrafts);
  }, [episodeDrafts]);

  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    void (async () => {
      if (!user) {
        return;
      }
      if (ownerAuthorized !== true) return;
      if (!activeSessionKey) return;
      try {
        const workspace = await loadRemoteWorkspace(user);
        if (!cancelled) setData(workspace);
      } catch (error) {
        if (!cancelled) setNotice({ tone: "error", message: `Studio data could not load: ${error instanceof Error ? error.message : "Unknown error"}` });
      } finally {
        if (!cancelled) setSettledWorkspaceSessionKey(activeSessionKey);
      }
    })();
    return () => { cancelled = true; };
  }, [activeSessionKey, ownerAuthorized, setData, user]);

  const sync = useCallback((key: WorkspaceArrayKey, record: BaseRecord, rollback: () => void) => {
    if (demoMode) return;
    void saveWithRetry(() => upsertRemoteRecord(key, record)).catch((error: unknown) => {
      rollback();
      const message = error instanceof Error ? error.message : "Unknown cloud error";
      setNotice({ tone: "error", message: `Cloud save failed twice, so the local change was rolled back: ${message}` });
    });
  }, []);

  const mutateRecord = useCallback(
    (key: WorkspaceArrayKey, recordId: string, patch: Record<string, unknown>) => {
      const current = getData();
      const records = current[key] as BaseRecord[];
      const previous = records.find((record) => record.id === recordId);
      if (!previous) return;
      const attempted = { ...previous, ...patch, updatedAt: now() };
      setData(replaceCollection(current, key, records.map((record) => record === previous ? attempted : record)));
      sync(key, attempted, () => {
        setData((latest) => replaceCollection(
          latest,
          key,
          rollbackUpdatedRecord(latest[key] as BaseRecord[], attempted, previous),
        ));
      });
    },
    [getData, setData, sync],
  );

  const appendRecord = useCallback(
    <T extends BaseRecord,>(key: WorkspaceArrayKey, record: T) => {
      const current = getData();
      const records = current[key] as BaseRecord[];
      setData(replaceCollection(current, key, [...records, record]));
      sync(key, record, () => {
        setData((latest) => replaceCollection(
          latest,
          key,
          rollbackAppendedRecord(latest[key] as BaseRecord[], record),
        ));
      });
    },
    [getData, setData, sync],
  );

  const linkGenerationAsset = useCallback(
    (generationId: string, assetId: string): AssetLink => {
      const current = getData();
      const validationError = validateGenerationAssetLink(current, generationId, assetId);
      if (validationError) throw new Error(validationError);
      const existing = current.assetLinks.find(
        (link) => link.assetId === assetId && link.targetType === "generation" && link.targetId === generationId,
      );
      const generation = current.generations.find((item) => item.id === generationId);
      if (!generation) throw new Error("Generation record not found.");

      if (existing) {
        if (!generation.assetIds.includes(assetId)) mutateRecord("generations", generationId, { assetIds: [...generation.assetIds, assetId] });
        return existing;
      }

      const record: AssetLink = {
        ...createBaseRecord(current.ownerId),
        assetId,
        targetType: "generation",
        targetId: generationId,
      };
      const attemptedGeneration: GenerationRecord = {
        ...generation,
        assetIds: [...generation.assetIds, assetId],
        updatedAt: now(),
      };
      setData({
        ...current,
        assetLinks: [...current.assetLinks, record],
        generations: current.generations.map((item) => item === generation ? attemptedGeneration : item),
      });
      sync("assetLinks", record, () => {
        setData((latest) => {
          if (!latest.assetLinks.some((link) => link === record)) return latest;
          const remainingLinks = rollbackAppendedRecord(latest.assetLinks, record);
          const stillLinked = remainingLinks.some(
            (link) => link.assetId === assetId && link.targetType === "generation" && link.targetId === generationId,
          );
          return {
            ...latest,
            assetLinks: remainingLinks,
            generations: latest.generations.map((item) => item.id === generationId && !stillLinked
              ? { ...item, assetIds: item.assetIds.filter((id) => id !== assetId) }
              : item),
          };
        });
      });
      return record;
    },
    [getData, mutateRecord, setData, sync],
  );

  const unlinkGenerationAsset = useCallback(
    async (generationId: string, assetId: string): Promise<void> => {
      const current = getData();
      const generation = current.generations.find((item) => item.id === generationId);
      if (!generation) throw new Error("Generation record not found.");
      const link = current.assetLinks.find(
        (item) => item.assetId === assetId && item.targetType === "generation" && item.targetId === generationId,
      );
      if (link && !demoMode) await permanentlyDeleteRemoteRecord("assetLinks", link.id);
      if (!link) {
        if (generation.assetIds.includes(assetId)) mutateRecord("generations", generationId, { assetIds: generation.assetIds.filter((id) => id !== assetId) });
        return;
      }
      setData((latest) => ({
        ...latest,
        assetLinks: latest.assetLinks.filter((item) => item.id !== link.id),
        generations: latest.generations.map((item) => item.id === generationId
          ? { ...item, assetIds: item.assetIds.filter((id) => id !== assetId), updatedAt: now() }
          : item),
      }));
    },
    [getData, mutateRecord, setData],
  );

  const { uploadTasks, startUpload, pauseUpload, resumeUpload, retryUpload, cancelUpload, dismissUpload } = useUploadManager({
    getWorkspace: getData,
    setWorkspace: setData,
    appendAsset: (asset) => appendRecord("assets", asset),
    setNotice,
  });

  const patchEpisodeDraft = useCallback((episodeId: string, patch: Partial<EpisodeDraft>) => {
    setEpisodeDrafts((current) => {
      const existing = current[episodeId] ?? { title: "", idea: "", tags: "", script: "" };
      return { ...current, [episodeId]: { ...existing, ...patch } };
    });
  }, []);

  const clearEpisodeDraft = useCallback((episodeId: string) => {
    setEpisodeDrafts((current) => {
      const next = { ...current };
      delete next[episodeId];
      return next;
    });
  }, []);

  const value = useMemo<StudioContextValue>(
    () => ({
      data,
      isDemo: demoMode,
      episodeDrafts,
      patchEpisodeDraft,
      clearEpisodeDraft,
      session,
      user,
      ownerAuthorized,
      ownerVerificationError,
      authLoading,
      dataLoading,
      notice,
      clearNotice: () => setNotice(null),
      login: signInWithGitHub,
      logout: signOut,
      retryOwnerVerification,
      uploadTasks,
      startUpload,
      pauseUpload,
      resumeUpload,
      retryUpload,
      cancelUpload,
      dismissUpload,
      createProject: (input) => {
        const record: Project = { ...createBaseRecord(data.ownerId), ...input };
        appendRecord("projects", record);
        return record;
      },
      createSeries: (input) => {
        const record: Series = { ...createBaseRecord(data.ownerId), ...input };
        appendRecord("series", record);
        return record;
      },
      createEpisode: (seriesId, title, ideaText) => {
        const series = data.series.find((item) => item.id === seriesId);
        const record: Episode = {
          ...createBaseRecord(data.ownerId),
          seriesId,
          number: getNextEpisodeNumber(data, seriesId),
          title,
          idea: ideaText,
          status: "idea",
          targetDurationSeconds: series?.targetDurationSeconds ?? 75,
          tags: [],
        };
        appendRecord("episodes", record);
        return record;
      },
      updateEpisode: (episodeId, patch) => mutateRecord("episodes", episodeId, patch),
      createEntity: (input) => {
        const record: ProductionEntity = {
          ...createBaseRecord(data.ownerId),
          ...input,
          details: input.details ?? {},
          referenceAssetIds: input.referenceAssetIds ?? [],
        };
        appendRecord("entities", record);
        return record;
      },
      updateEntity: (entityId, patch) => mutateRecord("entities", entityId, patch as Record<string, unknown>),
      saveScriptVersion: (episodeId, content, note) => {
        const versions = data.scripts.filter((script) => script.episodeId === episodeId);
        appendRecord("scripts", {
          ...createBaseRecord(data.ownerId),
          episodeId,
          version: versions.length ? Math.max(...versions.map((script) => script.version)) + 1 : 1,
          title: `Version ${versions.length + 1}`,
          content,
          note,
        });
      },
      addScene: (episodeId, beat, title) => {
        const scenes = data.scenes.filter((scene) => scene.episodeId === episodeId);
        const record: Scene = {
          ...createBaseRecord(data.ownerId),
          episodeId,
          title: title || `${beat[0].toUpperCase()}${beat.slice(1)} scene`,
          beat,
          summary: "",
          position: scenes.length,
        };
        appendRecord("scenes", record);
        return record;
      },
      addSitcomTemplate: (episodeId) => {
        const episode = data.episodes.find((item) => item.id === episodeId);
        const template: Array<{ beat: BeatType; title: string; summary: string }> = [
          { beat: "hook", title: "Hook", summary: "Open directly on the conflict or most surprising line." },
          { beat: "setup", title: "Setup", summary: "Give the audience only the context needed to follow the problem." },
          { beat: "escalation", title: "Escalation", summary: "Make the situation more specific, difficult, or absurd." },
          { beat: "payoff", title: "Payoff", summary: "Deliver the central comic turn or reveal." },
          { beat: "tag", title: "Tag", summary: "Add one brief final beat that extends or reverses the joke." },
        ];
        const existingCount = data.scenes.filter((scene) => scene.episodeId === episodeId).length;
        const shotDurations = getSitcomShotDurations(episode?.targetDurationSeconds ?? 75);
        const records: Scene[] = template.map((item, index) => ({
          ...createBaseRecord(data.ownerId),
          episodeId,
          ...item,
          position: existingCount + index,
        }));
        records.forEach((record) => appendRecord("scenes", record));
        const shotRecords: Shot[] = records.map((scene, index) => ({
          ...createBaseRecord(data.ownerId),
          sceneId: scene.id,
          title: `${scene.title} beat`,
          position: 0,
          durationSeconds: shotDurations[index] ?? 5,
          framing: "Medium shot",
          action: "",
          dialogue: "",
          prompt: `${scene.title}. Keep this within episode tone and 9:16 framing.`,
          status: "planned",
          characterIds: [],
          assetIds: [],
        }));
        shotRecords.forEach((shot) => appendRecord("shots", shot));
      },
      updateScene: (sceneId, patch) => mutateRecord("scenes", sceneId, patch),
      moveScene: (sceneId, direction) => {
        const scene = data.scenes.find((item) => item.id === sceneId);
        if (!scene) return;
        const peers = data.scenes
          .filter((item) => item.episodeId === scene.episodeId)
          .sort((a, b) => a.position - b.position);
        const index = peers.findIndex((item) => item.id === sceneId);
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= peers.length) return;
        const reordered = [...peers];
        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
        reordered.forEach((item, position) => mutateRecord("scenes", item.id, { position }));
      },
      addShot: (sceneId, title) => {
        const shots = data.shots.filter((shot) => shot.sceneId === sceneId);
        const record: Shot = {
          ...createBaseRecord(data.ownerId),
          sceneId,
          title: title || `Shot ${shots.length + 1}`,
          position: shots.length,
          durationSeconds: 5,
          framing: "Medium shot",
          action: "",
          dialogue: "",
          prompt: "",
          status: "planned",
          characterIds: [],
          assetIds: [],
        };
        appendRecord("shots", record);
        return record;
      },
      moveShot: (shotId, direction) => {
        const shot = data.shots.find((item) => item.id === shotId);
        if (!shot) return;
        const peers = data.shots
          .filter((item) => item.sceneId === shot.sceneId)
          .sort((a, b) => a.position - b.position);
        const index = peers.findIndex((item) => item.id === shotId);
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= peers.length) return;
        const reordered = [...peers];
        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
        reordered.forEach((item, position) => mutateRecord("shots", item.id, { position }));
      },
      updateShot: (shotId, patch) => mutateRecord("shots", shotId, patch as Record<string, unknown>),
      setAssetReview: (assetId, status) => mutateRecord("assets", assetId, { reviewStatus: status }),
      updateAssetMetadata: (assetId, patch) => mutateRecord("assets", assetId, patch),
      addAssetLink: (assetId, targetType, targetId) => {
        if (targetType === "generation") return linkGenerationAsset(targetId, assetId);
        const existing = data.assetLinks.find(
          (link) => link.assetId === assetId && link.targetType === targetType && link.targetId === targetId,
        );
        if (existing) return existing;
        const asset = data.assets.find((item) => item.id === assetId);
        if (!asset) throw new Error("Media asset not found.");
        const validTarget = getAssetLinkOptions(data, asset).some(
          (option) => option.targetType === targetType && option.targetId === targetId,
        );
        if (!validTarget) throw new Error("Choose a production record from the same project as this media.");
        const record: AssetLink = { ...createBaseRecord(data.ownerId), assetId, targetType, targetId };
        appendRecord("assetLinks", record);
        return record;
      },
      removeAssetLink: async (linkId) => {
        const link = getData().assetLinks.find((item) => item.id === linkId);
        if (link?.targetType === "generation") {
          await unlinkGenerationAsset(link.targetId, link.assetId);
          return;
        }
        if (!demoMode) await permanentlyDeleteRemoteRecord("assetLinks", linkId);
        setData((current) => ({ ...current, assetLinks: current.assetLinks.filter((link) => link.id !== linkId) }));
      },
      trashAsset: (assetId) => mutateRecord("assets", assetId, { deletedAt: now() }),
      restoreAsset: (assetId) => mutateRecord("assets", assetId, { deletedAt: undefined }),
      permanentlyDeleteAsset: async (assetId) => {
        if (demoMode) await deleteAssetBlob(assetId);
        else await deleteRemoteAsset(assetId);
        setData((current) => removeAssetFromWorkspace(current, assetId));
      },
      addTimeEntry: (episodeId, minutes, category, note) => {
        appendRecord("timeEntries", { ...createBaseRecord(data.ownerId), episodeId, minutes, category, note, occurredOn: now().slice(0, 10) });
      },
      addCostEntry: (episodeId, amountCents, category, provider, note) => {
        appendRecord("costEntries", { ...createBaseRecord(data.ownerId), episodeId, amountCents, category, provider, note, occurredOn: now().slice(0, 10) });
      },
      addPublication: (episodeId, platform, url) => {
        const record: Publication = { ...createBaseRecord(data.ownerId), episodeId, platform, url, publishedAt: now() };
        appendRecord("publications", record);
        return record;
      },
      addPromptVersion: (episodeId, purpose, content, shotId) => {
        if (!data.episodes.some((episode) => episode.id === episodeId)) throw new Error("Episode not found.");
        const validationError = validatePromptContent(content);
        if (validationError) throw new Error(validationError);
        if (shotId) {
          const shot = data.shots.find((item) => item.id === shotId);
          const scene = shot ? data.scenes.find((item) => item.id === shot.sceneId) : undefined;
          if (!scene || scene.episodeId !== episodeId) throw new Error("Choose a shot from this episode.");
        }
        const record: PromptVersion = {
          ...createBaseRecord(data.ownerId),
          episodeId,
          shotId,
          purpose,
          content,
          version: getNextPromptVersion(data.prompts, episodeId, purpose, shotId),
        };
        appendRecord("prompts", record);
        return record;
      },
      addGeneration: (input) => {
        const validationError = validateGenerationInput(data, input);
        if (validationError) throw new Error(validationError);
        const record: GenerationRecord = {
          ...createBaseRecord(data.ownerId),
          ...input,
          provider: input.provider.trim(),
          model: input.model.trim(),
          outcome: "unreviewed",
          assetIds: [],
        };
        appendRecord("generations", record);
        return record;
      },
      linkGenerationAsset,
      unlinkGenerationAsset,
      setGenerationOutcome: (generationId, outcome) => {
        const validationError = validateGenerationOutcome(data, generationId, outcome);
        if (validationError) throw new Error(validationError);
        mutateRecord("generations", generationId, { outcome });
      },
      quickCapture: (text) => appendRecord("captures", { ...createBaseRecord(data.ownerId), text }),
      convertCaptureToEpisode: (captureId, seriesId) => {
        const capture = data.captures.find((item) => item.id === captureId);
        if (!capture) return;
        const episode = value.createEpisode(seriesId, capture.text.slice(0, 70), capture.text);
        mutateRecord("captures", captureId, { convertedToEpisodeId: episode.id });
      },
      archiveProject: (projectId) => mutateRecord("projects", projectId, { archivedAt: now() }),
      resetDemo: () => {
        const reset = freshDemo();
        setData(reset);
        saveDemo(reset);
        setNotice({ tone: "success", message: "The fictional demo workspace was restored." });
      },
      exportWorkspace: () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `studioflow-export-${now().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      importWorkspace: async (file) => {
        const parsed = JSON.parse(await file.text()) as unknown;
        const normalized = parseWorkspaceExport(parsed, data.ownerId);
        if (!demoMode) {
          try {
            for (const key of workspaceCollectionKeys) {
              for (const record of normalized[key]) await saveWithRetry(() => upsertRemoteRecord(key, record));
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown cloud error";
            setNotice({ tone: "error", message: `Restore stopped after two failed cloud saves: ${message}` });
            if (user) {
              try {
                setData(await loadRemoteWorkspace(user));
              } catch {
                // Keep the pre-import local workspace when the cloud cannot be reloaded.
              }
            }
            throw error;
          }
        }
        setData(normalized);
        setNotice({ tone: "success", message: "StudioFlow metadata was restored from the export." });
      },
    }),
    [appendRecord, authLoading, cancelUpload, clearEpisodeDraft, data, dataLoading, dismissUpload, episodeDrafts, getData, linkGenerationAsset, mutateRecord, notice, ownerAuthorized, ownerVerificationError, patchEpisodeDraft, pauseUpload, resumeUpload, retryOwnerVerification, retryUpload, session, setData, startUpload, unlinkGenerationAsset, uploadTasks, user],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error("useStudio must be used inside StudioProvider.");
  return value;
}

export const episodeStatuses: EpisodeStatus[] = [
  "idea",
  "scripting",
  "shot_planning",
  "generating",
  "editing",
  "ready",
  "published",
  "archived",
];

export const entityKinds: EntityKind[] = ["character", "location", "prop", "style"];
