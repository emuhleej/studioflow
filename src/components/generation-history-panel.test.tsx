import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoWorkspace } from "../data/demo";
import { GenerationHistoryPanel } from "./generation-history-panel";

const addGeneration = vi.fn();

vi.mock("../state/studio-store", () => ({
  useStudio: () => ({ data: demoWorkspace, addGeneration }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  addGeneration.mockImplementation((input) => ({
    ...demoWorkspace.generations[0],
    ...input,
    id: "generation-new",
    provider: input.provider.trim(),
    model: input.model.trim(),
  }));
});

describe("GenerationHistoryPanel", () => {
  it("saves complete manual provenance with a prompt and matching shot", async () => {
    const user = userEvent.setup();
    render(<GenerationHistoryPanel episodeId="episode-fridge" />);
    await user.click(screen.getByRole("button", { name: "Log generation" }));

    const dialog = screen.getByRole("dialog", { name: "Log generation" });
    fireEvent.change(within(dialog).getByLabelText("Provider"), { target: { value: "Example Video" } });
    fireEvent.change(within(dialog).getByLabelText("Model"), { target: { value: "cinema-v2" } });
    await user.selectOptions(within(dialog).getByLabelText("Prompt version"), "prompt-shot-one-v2");
    expect(within(dialog).getByLabelText("Shot")).toHaveValue("shot-1");
    expect(within(dialog).getByLabelText("Shot")).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Cost (USD)"), { target: { value: "1.25" } });
    fireEvent.change(within(dialog).getByLabelText("Duration (seconds)"), { target: { value: "6.5" } });
    fireEvent.change(within(dialog).getByLabelText("Notes"), { target: { value: "Kept for provenance." } });
    await user.click(within(dialog).getByRole("button", { name: "Save generation" }));

    expect(addGeneration).toHaveBeenCalledWith({
      episodeId: "episode-fridge",
      shotId: "shot-1",
      promptVersionId: "prompt-shot-one-v2",
      provider: "Example Video",
      model: "cinema-v2",
      costCents: 125,
      durationSeconds: 6.5,
      notes: "Kept for provenance.",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Saved generation from Example Video · cinema-v2.");
  });

  it("shows the prompt, shot, duration, cost, and notes for an existing record", () => {
    render(<GenerationHistoryPanel episodeId="episode-fridge" />);
    expect(screen.getByText("Example Video · cinema-v1")).toBeInTheDocument();
    expect(screen.getByText("Video v2 · Immediate argument")).toBeInTheDocument();
    expect(screen.getByText("6s")).toBeInTheDocument();
    expect(screen.getByText("$1.84")).toBeInTheDocument();
    expect(screen.getByText("Selected for expression and continuity.")).toBeInTheDocument();
  });

  it("keeps provider execution and 7C decision controls out of the workflow", async () => {
    const user = userEvent.setup();
    render(<GenerationHistoryPanel episodeId="episode-fridge" />);
    await user.click(screen.getByRole("button", { name: "Log generation" }));
    expect(screen.getByText(/StudioFlow does not call the provider\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate|select|reject/i })).not.toBeInTheDocument();
  });
});
