import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  isOwnerWorkspaceLoading,
  useOwnerAuthorization,
  verifyOwnerAuthorization,
  type OwnerCheckResponse,
} from "./use-owner-authorization";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("owner authorization", () => {
  it("stabilizes the session and retries one transient 401", async () => {
    const verify = vi.fn<() => Promise<OwnerCheckResponse>>()
      .mockResolvedValueOnce({ data: null, error: { message: "JWT not ready" }, status: 401 })
      .mockResolvedValueOnce({ data: true, error: null, status: 200 });
    const stabilizeSession = vi.fn().mockResolvedValue(true);

    await expect(verifyOwnerAuthorization(verify, stabilizeSession)).resolves.toEqual({ status: "allowed" });
    expect(stabilizeSession).toHaveBeenCalledOnce();
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it("does not let a stale 401 overwrite a newer 200 result", async () => {
    const oldCheck = deferred<OwnerCheckResponse>();
    const newCheck = deferred<OwnerCheckResponse>();
    const verify = vi.fn<() => Promise<OwnerCheckResponse>>()
      .mockImplementationOnce(() => oldCheck.promise)
      .mockImplementationOnce(() => newCheck.promise);
    const stabilizeSession = vi.fn().mockResolvedValue(true);
    const { result, rerender } = renderHook(
      ({ sessionKey }) => useOwnerAuthorization({ enabled: true, sessionKey, verify, stabilizeSession }),
      { initialProps: { sessionKey: "older-session" } },
    );

    await waitFor(() => expect(verify).toHaveBeenCalledTimes(1));
    rerender({ sessionKey: "newer-session" });
    await waitFor(() => expect(verify).toHaveBeenCalledTimes(2));

    await act(async () => {
      newCheck.resolve({ data: true, error: null, status: 200 });
    });
    await waitFor(() => expect(result.current.state).toEqual({ status: "allowed" }));

    await act(async () => {
      oldCheck.resolve({ data: null, error: { message: "Unauthorized" }, status: 401 });
    });
    expect(result.current.state).toEqual({ status: "allowed" });
    expect(stabilizeSession).not.toHaveBeenCalled();
  });

  it("clears an allowed result when the authenticated session is removed", async () => {
    const verify = vi.fn().mockResolvedValue({ data: true, error: null, status: 200 });
    const stabilizeSession = vi.fn().mockResolvedValue(true);
    const { result, rerender } = renderHook(
      ({ enabled, sessionKey }) => useOwnerAuthorization({ enabled, sessionKey, verify, stabilizeSession }),
      { initialProps: { enabled: true, sessionKey: "signed-in-session" as string | null } },
    );

    await waitFor(() => expect(result.current.state).toEqual({ status: "allowed" }));
    rerender({ enabled: false, sessionKey: null });

    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("keeps a newly authorized session behind the gate until its workspace load settles", () => {
    expect(isOwnerWorkspaceLoading(false, { status: "allowed" }, "new-session", null)).toBe(true);
    expect(isOwnerWorkspaceLoading(false, { status: "allowed" }, "new-session", "old-session")).toBe(true);
    expect(isOwnerWorkspaceLoading(false, { status: "allowed" }, "new-session", "new-session")).toBe(false);
  });
});
