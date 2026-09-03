import { pathToFileURL } from "node:url";

export const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function isProductionReleaseApproved(environment = process.env) {
  const approvedCommit = environment.STUDIOFLOW_PRODUCTION_RELEASE_COMMIT?.trim();
  const currentCommit = environment.COMMIT_REF?.trim();

  return Boolean(
    approvedCommit
      && currentCommit
      && COMMIT_SHA_PATTERN.test(approvedCommit)
      && COMMIT_SHA_PATTERN.test(currentCommit)
      && approvedCommit.toLowerCase() === currentCommit.toLowerCase(),
  );
}

export function runProductionGuard(environment = process.env, logger = console) {
  if (isProductionReleaseApproved(environment)) {
    logger.log("StudioFlow production release approval matches this exact commit.");
    return 0;
  }

  logger.error(
    "StudioFlow production deployment is locked. STUDIOFLOW_PRODUCTION_RELEASE_COMMIT must match the exact 40-character COMMIT_REF.",
  );
  return 1;
}

const executedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (executedDirectly) {
  process.exitCode = runProductionGuard();
}
