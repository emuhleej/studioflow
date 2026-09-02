import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { deleteAssetBlob, saveAssetBlob } from "../lib/blob-store";
import { canAcceptAsset } from "../lib/domain";
import {
  cancelRemoteMediaUpload,
  isUploadAbortError,
  resumeRemoteMediaUpload,
  startRemoteMediaUpload,
  transferRemoteMediaUpload,
  type RemoteUploadSession,
} from "../lib/media-upload";
import { createUploadTask, transitionUploadTask, type UploadTask, type UploadTaskEvent } from "../lib/upload-task";
import type { Asset, AssetKind, WorkspaceData } from "../types";
import type { Notice } from "./studio-context";
import { createBaseRecord, createId, demoMode, now } from "./workspace-persistence";

interface InternalUploadTask {
  task: UploadTask;
  file: File;
  projectId: string;
  episodeId?: string;
  remoteSession?: RemoteUploadSession;
  localAsset?: Asset;
  controller?: AbortController;
  runId: number;
  assetCommitted: boolean;
}

interface UploadManagerOptions {
  getWorkspace: () => WorkspaceData;
  setWorkspace: Dispatch<SetStateAction<WorkspaceData>>;
  appendAsset: (asset: Asset) => void;
  setNotice: Dispatch<SetStateAction<Notice>>;
}

export function useUploadManager({ getWorkspace, setWorkspace, appendAsset, setNotice }: UploadManagerOptions) {
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const uploadTaskRecords = useRef(new Map<string, InternalUploadTask>());

  const publishUploadEvent = useCallback((record: InternalUploadTask, event: UploadTaskEvent) => {
    record.task = transitionUploadTask(record.task, event);
    setUploadTasks(Array.from(uploadTaskRecords.current.values(), (item) => item.task));
  }, []);

  const runUploadTask = useCallback(
    async (record: InternalUploadTask) => {
      if (!["queued", "paused", "failed"].includes(record.task.status)) return;
      const runId = record.runId + 1;
      const controller = new AbortController();
      record.runId = runId;
      record.controller = controller;
      publishUploadEvent(record, { type: "start" });

      try {
        let asset: Asset;
        if (demoMode) {
          record.localAsset ??= {
            ...createBaseRecord(getWorkspace().ownerId),
            projectId: record.projectId,
            episodeId: record.episodeId,
            kind: record.task.kind,
            filename: record.file.name,
            mimeType: record.file.type,
            bytes: record.file.size,
            storageKey: `local/${createId()}/${record.file.name}`,
            reviewStatus: "unreviewed",
            source: "upload",
            notes: "",
          };
          asset = record.localAsset;
          await saveAssetBlob(asset.id, record.file);
          if (controller.signal.aborted) throw new DOMException("The upload was paused or cancelled.", "AbortError");
          publishUploadEvent(record, { type: "progress", progress: 1 });
        } else {
          const session = record.remoteSession
            ? await resumeRemoteMediaUpload(record.remoteSession)
            : await startRemoteMediaUpload(record.file, record.projectId, record.episodeId, record.task.kind);
          record.remoteSession = session;
          if (controller.signal.aborted) throw new DOMException("The upload was paused or cancelled.", "AbortError");
          await transferRemoteMediaUpload(
            session,
            record.file,
            (progress) => {
              if (record.runId === runId) publishUploadEvent(record, { type: "progress", progress });
            },
            controller.signal,
          );
          asset = session.asset;
        }

        if (record.runId !== runId || controller.signal.aborted) return;
        if (!record.assetCommitted) {
          appendAsset(asset);
          record.assetCommitted = true;
        }
        publishUploadEvent(record, { type: "complete", assetId: asset.id });
        setNotice({ tone: "success", message: `${record.file.name} was added to the media library.` });
      } catch (error) {
        if (record.runId !== runId) return;
        if (isUploadAbortError(error) && ["paused", "cancelling"].includes(record.task.status)) return;
        publishUploadEvent(record, {
          type: "fail",
          error: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    },
    [appendAsset, getWorkspace, publishUploadEvent, setNotice],
  );

  const startUpload = useCallback(
    ({ file, projectId, episodeId, kind }: { file: File; projectId: string; episodeId?: string; kind: AssetKind }) => {
      const acceptance = canAcceptAsset(getWorkspace(), { bytes: file.size, kind, mimeType: file.type });
      if (!acceptance.allowed) throw new Error(acceptance.reason);
      const taskId = createId();
      const record: InternalUploadTask = {
        task: createUploadTask({ id: taskId, filename: file.name, bytes: file.size, kind, createdAt: now() }),
        file,
        projectId,
        episodeId,
        runId: 0,
        assetCommitted: false,
      };
      uploadTaskRecords.current.set(taskId, record);
      setUploadTasks(Array.from(uploadTaskRecords.current.values(), (item) => item.task));
      void runUploadTask(record);
      return taskId;
    },
    [getWorkspace, runUploadTask],
  );

  const pauseUpload = useCallback((taskId: string) => {
    const record = uploadTaskRecords.current.get(taskId);
    if (!record || record.task.status !== "uploading") return;
    publishUploadEvent(record, { type: "pause" });
    record.controller?.abort();
  }, [publishUploadEvent]);

  const resumeUpload = useCallback((taskId: string) => {
    const record = uploadTaskRecords.current.get(taskId);
    if (record?.task.status === "paused") void runUploadTask(record);
  }, [runUploadTask]);

  const retryUpload = useCallback((taskId: string) => {
    const record = uploadTaskRecords.current.get(taskId);
    if (record?.task.status === "failed") void runUploadTask(record);
  }, [runUploadTask]);

  const cancelUpload = useCallback(async (taskId: string) => {
    const record = uploadTaskRecords.current.get(taskId);
    if (!record || ["completed", "cancelled", "cancelling"].includes(record.task.status)) return;
    record.runId += 1;
    publishUploadEvent(record, { type: "cancel-requested" });
    record.controller?.abort();
    try {
      if (record.remoteSession) await cancelRemoteMediaUpload(record.remoteSession.asset.id);
      if (record.localAsset) await deleteAssetBlob(record.localAsset.id);
      if (record.assetCommitted) {
        const assetId = record.localAsset?.id ?? record.remoteSession?.asset.id;
        setWorkspace((current) => ({ ...current, assets: current.assets.filter((asset) => asset.id !== assetId) }));
        record.assetCommitted = false;
      }
      publishUploadEvent(record, { type: "cancelled" });
    } catch (error) {
      publishUploadEvent(record, {
        type: "fail",
        error: error instanceof Error ? error.message : "The upload could not be cancelled.",
      });
    }
  }, [publishUploadEvent, setWorkspace]);

  const dismissUpload = useCallback((taskId: string) => {
    const record = uploadTaskRecords.current.get(taskId);
    if (!record || !["completed", "cancelled"].includes(record.task.status)) return;
    uploadTaskRecords.current.delete(taskId);
    setUploadTasks(Array.from(uploadTaskRecords.current.values(), (item) => item.task));
  }, []);

  return { uploadTasks, startUpload, pauseUpload, resumeUpload, retryUpload, cancelUpload, dismissUpload };
}
