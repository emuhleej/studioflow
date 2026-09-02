import { CheckCircle2, LoaderCircle, Pause, Play, RotateCw, X } from "lucide-react";
import { formatBytes, titleCase } from "../lib/format";
import type { UploadTask } from "../lib/upload-task";
import { Button } from "./ui";

interface UploadTaskListProps {
  tasks: UploadTask[];
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
}

export function UploadTaskList({ tasks, onPause, onResume, onRetry, onCancel, onDismiss }: UploadTaskListProps) {
  if (!tasks.length) return null;

  return (
    <section className="panel panel-pad mb-4" aria-labelledby="upload-tasks-heading">
      <div className="eyebrow">Transfers</div>
      <h2 id="upload-tasks-heading" className="section-title mt-1">Upload tasks</h2>
      <div className="mt-4 grid gap-3">
        {tasks.map((task) => (
          <article key={task.id} className="rounded-xl border border-[var(--line)] bg-black/10 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {task.status === "completed" ? <CheckCircle2 size={16} color="var(--mint)" /> : null}
                  {task.status === "uploading" || task.status === "cancelling" ? <LoaderCircle className="animate-spin" size={16} /> : null}
                  <strong className="truncate text-sm">{task.filename}</strong>
                  <span className="badge">{titleCase(task.status)}</span>
                </div>
                <div className="muted mt-1 text-xs">{titleCase(task.kind)} · {formatBytes(task.bytes)}</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="progress-track flex-1" aria-label={`${task.filename} upload progress`}>
                    <div className="progress-fill" style={{ width: `${Math.round(task.progress * 100)}%` }} />
                  </div>
                  <span className="quiet w-10 text-right text-xs">{Math.round(task.progress * 100)}%</span>
                </div>
                {task.error ? <p className="mt-2 text-xs text-[#ffb3ad]" role="alert">{task.error}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {task.status === "uploading" ? <Button onClick={() => onPause(task.id)}><Pause size={15} />Pause</Button> : null}
                {task.status === "paused" ? <Button variant="primary" onClick={() => onResume(task.id)}><Play size={15} />Resume</Button> : null}
                {task.status === "failed" ? <Button variant="primary" onClick={() => onRetry(task.id)}><RotateCw size={15} />Retry</Button> : null}
                {["queued", "uploading", "paused", "failed"].includes(task.status) ? <Button variant="danger" onClick={() => onCancel(task.id)}><X size={15} />Cancel</Button> : null}
                {task.status === "cancelling" ? <Button disabled><LoaderCircle className="animate-spin" size={15} />Cancelling</Button> : null}
                {["completed", "cancelled"].includes(task.status) ? <Button onClick={() => onDismiss(task.id)}>Dismiss</Button> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
