import { useCallback, useEffect, useRef, useState } from "react";

export type OwnerAuthorizationState =
  | { status: "idle" | "checking" | "allowed" | "denied" }
  | { status: "error"; message: string };

export interface OwnerCheckResponse {
  data: boolean | null;
  error: { code?: string; message: string } | null;
  status?: number;
}

interface UseOwnerAuthorizationOptions {
  enabled: boolean;
  sessionKey: string | null;
  verify: () => Promise<OwnerCheckResponse>;
  stabilizeSession: () => Promise<boolean>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown owner-verification error";
}

function resultFromResponse(response: OwnerCheckResponse): OwnerAuthorizationState {
  if (response.error) return { status: "error", message: response.error.message };
  if (response.data === true) return { status: "allowed" };
  if (response.data === false) return { status: "denied" };
  return { status: "error", message: "Owner verification returned no access decision." };
}

function isTransientUnauthorized(response: OwnerCheckResponse): boolean {
  if (response.status === 401) return true;
  if (response.error?.code === "PGRST301" || response.error?.code === "PGRST302") return true;
  return /\b(?:401|jwt|unauthorized)\b/i.test(response.error?.message ?? "");
}

export async function verifyOwnerAuthorization(
  verify: () => Promise<OwnerCheckResponse>,
  stabilizeSession: () => Promise<boolean>,
  shouldContinue: () => boolean = () => true,
): Promise<OwnerAuthorizationState | null> {
  try {
    const first = await verify();
    if (!shouldContinue()) return null;
    if (!first.error || !isTransientUnauthorized(first)) return resultFromResponse(first);

    const sessionReady = await stabilizeSession();
    if (!shouldContinue()) return null;
    if (!sessionReady) {
      return { status: "error", message: "The authenticated session was not ready for owner verification." };
    }

    return resultFromResponse(await verify());
  } catch (error) {
    if (!shouldContinue()) return null;
    return { status: "error", message: errorMessage(error) };
  }
}

export function isOwnerWorkspaceLoading(
  demoMode: boolean,
  authorization: OwnerAuthorizationState,
  activeSessionKey: string | null,
  settledWorkspaceSessionKey: string | null,
): boolean {
  if (demoMode) return false;
  if (authorization.status === "checking") return true;
  return authorization.status === "allowed"
    && (activeSessionKey === null || settledWorkspaceSessionKey !== activeSessionKey);
}

export function useOwnerAuthorization({
  enabled,
  sessionKey,
  verify,
  stabilizeSession,
}: UseOwnerAuthorizationOptions): { state: OwnerAuthorizationState; retry: () => void } {
  const [settled, setSettled] = useState<{ sessionKey: string; state: OwnerAuthorizationState } | null>(null);
  const requestRevision = useRef(0);

  const run = useCallback(() => {
    const revision = ++requestRevision.current;
    if (!enabled || !sessionKey) return;

    setSettled({ sessionKey, state: { status: "checking" } });
    void verifyOwnerAuthorization(
      verify,
      stabilizeSession,
      () => requestRevision.current === revision,
    ).then((state) => {
      if (state && requestRevision.current === revision) setSettled({ sessionKey, state });
    });
  }, [enabled, sessionKey, stabilizeSession, verify]);

  useEffect(() => {
    const timer = window.setTimeout(run, 0);
    return () => {
      window.clearTimeout(timer);
      requestRevision.current += 1;
    };
  }, [run]);

  const state: OwnerAuthorizationState = !enabled || !sessionKey
    ? { status: "idle" }
    : settled?.sessionKey === sessionKey
      ? settled.state
      : { status: "checking" };

  return { state, retry: run };
}
