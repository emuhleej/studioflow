import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UploadTask } from "../lib/upload-task";
import { UploadTaskList } from "./upload-task-list";

function renderTasks(tasks: UploadTask[]) {
  const actions = {
    onPause: vi.fn(),
    onResume: vi.fn(),
    onRetry: vi.fn(),
    onCancel: vi.fn(),
    onDismiss: vi.fn(),
  };
  render(<UploadTaskList tasks={tasks} {...actions} />);
  return actions;
}

const baseTask: UploadTask = {
  id: "task-1",
  filename: "episode.mp4",
  bytes: 1_000,
  kind: "video",
  progress: 0.4,
  status: "uploading",
  createdAt: "2026-09-01T00:00:00.000Z",
};

describe("UploadTaskList", () => {
  it("offers pause and cancel for an active upload", async () => {
    const user = userEvent.setup();
    const actions = renderTasks([baseTask]);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(actions.onPause).toHaveBeenCalledWith("task-1");
    expect(actions.onCancel).toHaveBeenCalledWith("task-1");
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("offers resume for paused tasks and retry for failed tasks", () => {
    renderTasks([
      { ...baseTask, id: "paused", status: "paused" },
      { ...baseTask, id: "failed", status: "failed", error: "Connection lost." },
    ]);

    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Connection lost.");
  });

  it("keeps completed tasks dismissible without destructive controls", () => {
    renderTasks([{ ...baseTask, status: "completed", progress: 1, assetId: "asset-1" }]);

    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});
