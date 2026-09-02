import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoWorkspace } from "../data/demo";
import { createMediaAccess, downloadMediaAsset } from "../lib/media-access";
import { MediaDownloadButton, MediaPreview } from "./media-preview";

vi.mock("../state/studio-store", () => ({ useStudio: () => ({ isDemo: false }) }));
vi.mock("../lib/media-access", async () => {
  const actual = await vi.importActual<typeof import("../lib/media-access")>("../lib/media-access");
  return { ...actual, createMediaAccess: vi.fn(), downloadMediaAsset: vi.fn() };
});

const remoteAsset = { ...demoWorkspace.assets[0], source: "upload" as const };

beforeEach(() => vi.clearAllMocks());

describe("MediaPreview", () => {
  it("shows loading and then renders private media", async () => {
    vi.mocked(createMediaAccess).mockResolvedValue({ url: "https://private.example/preview", release: vi.fn() });
    render(<MediaPreview asset={remoteAsset} controls />);

    expect(screen.getByLabelText(`Loading ${remoteAsset.filename}`)).toBeInTheDocument();
    expect(await screen.findByLabelText(remoteAsset.filename)).toHaveAttribute("src", "https://private.example/preview");
  });

  it("shows an explicit error and retries with fresh access", async () => {
    const user = userEvent.setup();
    vi.mocked(createMediaAccess)
      .mockRejectedValueOnce(new Error("Signed URL expired."))
      .mockResolvedValueOnce({ url: "https://private.example/fresh", release: vi.fn() });
    render(<MediaPreview asset={remoteAsset} controls />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Signed URL expired.");
    await user.click(screen.getByRole("button", { name: "Retry preview" }));
    expect(await screen.findByLabelText(remoteAsset.filename)).toHaveAttribute("src", "https://private.example/fresh");
  });

  it("automatically requests one fresh URL after a playback error", async () => {
    vi.mocked(createMediaAccess)
      .mockResolvedValueOnce({ url: "https://private.example/expired", release: vi.fn() })
      .mockResolvedValueOnce({ url: "https://private.example/fresh", release: vi.fn() });
    render(<MediaPreview asset={remoteAsset} controls />);

    fireEvent.error(await screen.findByLabelText(remoteAsset.filename));
    await waitFor(() => expect(createMediaAccess).toHaveBeenCalledTimes(2));
  });
});

describe("MediaDownloadButton", () => {
  it("reports download preparation failures without losing the action", async () => {
    const user = userEvent.setup();
    vi.mocked(downloadMediaAsset).mockRejectedValue(new Error("Download URL expired."));
    render(<MediaDownloadButton asset={remoteAsset} />);

    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Download URL expired.");
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });
});
