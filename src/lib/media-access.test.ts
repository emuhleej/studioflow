import { afterEach, describe, expect, it, vi } from "vitest";
import { demoWorkspace } from "../data/demo";
import { createMediaAccess, downloadMediaAsset, getMediaRefreshDelay } from "./media-access";
import { loadAssetBlob } from "./blob-store";
import { getRemoteAssetAccess } from "./media-upload";

vi.mock("./blob-store", () => ({ loadAssetBlob: vi.fn() }));
vi.mock("./media-upload", () => ({ getRemoteAssetAccess: vi.fn() }));

const asset = demoWorkspace.assets[0];

afterEach(() => vi.restoreAllMocks());

describe("media access lifecycle", () => {
  it("creates and releases a browser-local preview URL", async () => {
    vi.mocked(loadAssetBlob).mockResolvedValue(new Blob(["demo"], { type: "video/mp4" }));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:studioflow-preview");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const access = await createMediaAccess(asset, true, "preview");
    expect(access.url).toBe("blob:studioflow-preview");
    access.release();
    expect(revoke).toHaveBeenCalledWith("blob:studioflow-preview");
  });

  it("requests attachment disposition and calculates remote expiry", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    vi.mocked(getRemoteAssetAccess).mockResolvedValue({ url: "https://private.example/signed", expiresInSeconds: 600 });

    const access = await createMediaAccess(asset, false, "download");
    expect(getRemoteAssetAccess).toHaveBeenCalledWith(asset.id, "attachment");
    expect(access.expiresAt).toBe(601_000);
  });

  it("refreshes signed previews thirty seconds before expiry", () => {
    expect(getMediaRefreshDelay(610_000, 10_000)).toBe(570_000);
    expect(getMediaRefreshDelay(undefined, 10_000)).toBeNull();
  });

  it("surfaces missing browser-local bytes", async () => {
    vi.mocked(loadAssetBlob).mockResolvedValue(undefined);
    await expect(createMediaAccess(asset, true, "preview")).rejects.toThrow("Upload it again");
  });

  it("starts a named download and releases temporary access", async () => {
    vi.mocked(loadAssetBlob).mockResolvedValue(new Blob(["demo"]));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.spyOn(window, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") callback();
      return 1;
    }) as typeof window.setTimeout);

    await downloadMediaAsset(asset, true);
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:download");
  });
});
