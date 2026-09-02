import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoWorkspace } from "../data/demo";
import { PromptHistoryPanel } from "./prompt-history-panel";

const addPromptVersion = vi.fn();

vi.mock("../state/studio-store", () => ({
  useStudio: () => ({ data: demoWorkspace, addPromptVersion }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  addPromptVersion.mockImplementation((episodeId, purpose, content, shotId) => ({
    ...demoWorkspace.prompts[0],
    id: "new-prompt",
    episodeId,
    purpose,
    content,
    shotId,
    version: 3,
  }));
});

describe("PromptHistoryPanel", () => {
  it("saves exact content in the selected shot chain", async () => {
    const user = userEvent.setup();
    render(<PromptHistoryPanel episodeId="episode-fridge" />);

    await user.selectOptions(screen.getByLabelText("Shot"), "shot-2");
    await user.type(screen.getByLabelText("Prompt"), "  Exact prompt spacing.  ");
    await user.click(screen.getByRole("button", { name: "Save prompt version" }));

    expect(addPromptVersion).toHaveBeenCalledWith("episode-fridge", "video", "  Exact prompt spacing.  ", "shot-2");
    expect(screen.getByRole("status")).toHaveTextContent("Saved Video version 3.");
  });

  it("rejects a blank prompt", async () => {
    const user = userEvent.setup();
    render(<PromptHistoryPanel episodeId="episode-fridge" />);

    await user.type(screen.getByLabelText("Prompt"), "   ");
    await user.click(screen.getByRole("button", { name: "Save prompt version" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a prompt before saving a version.");
    expect(addPromptVersion).not.toHaveBeenCalled();
  });

  it("copies an old version into a new draft without mutation controls", async () => {
    const user = userEvent.setup();
    render(<PromptHistoryPanel episodeId="episode-fridge" />);

    await user.click(screen.getAllByRole("button", { name: "Use as next draft" })[0]);
    expect(screen.getByLabelText("Prompt")).toHaveValue(demoWorkspace.prompts[1].content);
    expect(screen.queryByRole("button", { name: /delete|edit/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saving will create another version.");
  });
});
