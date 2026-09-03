import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoWorkspace } from "../data/demo";
import { GenerationHistoryPanel } from "./generation-history-panel";

const addGeneration = vi.fn();
const linkGenerationAsset = vi.fn();
const unlinkGenerationAsset = vi.fn();
const setGenerationOutcome = vi.fn();
const simulateGeneration = vi.fn();
const cancelManagedGeneration = vi.fn();
const resolveUnknownSubmission = vi.fn();

vi.mock("../state/studio-store", () => ({
  useStudio: () => ({
    data: demoWorkspace,
    isDemo: true,
    addGeneration,
    simulateGeneration,
    cancelManagedGeneration,
    resolveUnknownSubmission,
    linkGenerationAsset,
    unlinkGenerationAsset,
    setGenerationOutcome,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  unlinkGenerationAsset.mockResolvedValue(undefined);
  simulateGeneration.mockResolvedValue("simulated-generation");
  addGeneration.mockImplementation((input) => ({
    ...demoWorkspace.generations[0],
    ...input,
    id: "generation-new",
    provider: input.provider.trim(),
    model: input.model.trim(),
  }));
});

describe("GenerationHistoryPanel", () => {
  it("starts an account-free image simulation with a locked prompt and optional reference", async () => {
    const user = userEvent.setup();
    render(<GenerationHistoryPanel episodeId="episode-fridge" />);
    expect(screen.getByText("Real generation off")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try free simulation" }));
    await user.selectOptions(screen.getByLabelText("Simulation type"), "image");
    await user.selectOptions(screen.getByLabelText("Locked prompt version"), "prompt-shot-one-v2");
    await user.selectOptions(screen.getByLabelText("Optional reference image"), "asset-fridge-ref");
    await user.click(screen.getByRole("button", { name: "Run free simulation" }));
    expect(simulateGeneration).toHaveBeenCalledWith({
      episodeId: "episode-fridge",
      shotId: "shot-1",
      promptVersionId: "prompt-shot-one-v2",
      mediaKind: "image",
      model: "fake-image-v1",
      settings: { aspectRatio: "9:16", qualityTier: "draft", durationSeconds: undefined, outputCount: 1 },
      references: [{ assetId: "asset-fridge-ref", role: "reference_image" }],
    });
    expect(screen.getByRole("status")).toHaveTextContent("No AI provider or paid service was contacted");
  });

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
    expect(screen.getAllByText("Video v2 · Immediate argument")).not.toHaveLength(0);
    expect(screen.getByText("6s")).toBeInTheDocument();
    expect(screen.getByText("$1.84")).toBeInTheDocument();
    expect(screen.getByText("Selected for expression and continuity.")).toBeInTheDocument();
  });

  it("links and removes result media through the generation workflow", async () => {
    const user = userEvent.setup();
    render(<GenerationHistoryPanel episodeId="episode-fridge" />);
    await user.click(screen.getByRole("button", { name: "Manage results" }));

    const dialog = screen.getByRole("dialog", { name: "Manage result media" });
    expect(within(dialog).getByText("maya-fridge-hook-v03.mp4")).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText("Result media"), "asset-voice");
    await user.click(within(dialog).getByRole("button", { name: "Attach result" }));
    expect(linkGenerationAsset).toHaveBeenCalledWith("generation-hook-v3", "asset-voice");

    await user.click(within(dialog).getByRole("button", { name: "Remove maya-fridge-hook-v03.mp4 from generation" }));
    expect(unlinkGenerationAsset).toHaveBeenCalledWith("generation-hook-v3", "asset-shot-one");
  });

  it("records selected, rejected, and reset decisions without provider execution", async () => {
    const user = userEvent.setup();
    render(<GenerationHistoryPanel episodeId="episode-fridge" />);
    expect(screen.getByText(/StudioFlow does not call the provider\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^generate/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reject Example Video cinema-v1" }));
    expect(setGenerationOutcome).toHaveBeenCalledWith("generation-hook-v3", "rejected");
    await user.click(screen.getByRole("button", { name: "Reset Example Video cinema-v1 review" }));
    expect(setGenerationOutcome).toHaveBeenCalledWith("generation-hook-v3", "unreviewed");
  });
});
