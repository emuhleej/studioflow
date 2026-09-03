import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isProductionReleaseApproved,
  runProductionGuard,
} from "./netlify-production-guard.mjs";

const quietLogger = {
  error() {},
  log() {},
};

const guardPath = fileURLToPath(new URL("./netlify-production-guard.mjs", import.meta.url));
const netlifyConfigPath = fileURLToPath(new URL("../netlify.toml", import.meta.url));
const exactCommit = "0123456789abcdef0123456789abcdef01234567";

function runGuardProcess(environment) {
  const childEnvironment = { ...process.env, ...environment };
  delete childEnvironment.STUDIOFLOW_PRODUCTION_RELEASE_COMMIT;
  Object.assign(childEnvironment, environment);

  return spawnSync(process.execPath, [guardPath], {
    encoding: "utf8",
    env: childEnvironment,
  });
}

test("production stays locked without explicit approval", () => {
  assert.equal(isProductionReleaseApproved({}), false);
  assert.equal(runProductionGuard({}, quietLogger), 1);
});

test("similar values cannot accidentally unlock production", () => {
  assert.equal(isProductionReleaseApproved({ STUDIOFLOW_PRODUCTION_RELEASE_COMMIT: "approved" }), false);
  assert.equal(isProductionReleaseApproved({
    COMMIT_REF: "0123456789abcdef0123456789abcdef01234567",
    STUDIOFLOW_PRODUCTION_RELEASE_COMMIT: "true",
  }), false);
});

test("a different or shortened commit stays locked", () => {
  assert.equal(isProductionReleaseApproved({
    COMMIT_REF: "0123456789abcdef0123456789abcdef01234567",
    STUDIOFLOW_PRODUCTION_RELEASE_COMMIT: "1123456789abcdef0123456789abcdef01234567",
  }), false);
  assert.equal(isProductionReleaseApproved({
    COMMIT_REF: "0123456789abcdef0123456789abcdef01234567",
    STUDIOFLOW_PRODUCTION_RELEASE_COMMIT: "0123456",
  }), false);
});

test("only the exact approved commit permits a release candidate", () => {
  const environment = {
    COMMIT_REF: exactCommit,
    STUDIOFLOW_PRODUCTION_RELEASE_COMMIT: exactCommit.toUpperCase(),
  };
  assert.equal(isProductionReleaseApproved(environment), true);
  assert.equal(runProductionGuard(environment, quietLogger), 0);
});

test("the executable guard fails closed and opens only for the exact commit", () => {
  const locked = runGuardProcess({ COMMIT_REF: exactCommit });
  assert.equal(locked.status, 1);
  assert.match(locked.stderr, /production deployment is locked/i);

  const mismatched = runGuardProcess({
    COMMIT_REF: exactCommit,
    STUDIOFLOW_PRODUCTION_RELEASE_COMMIT: "1123456789abcdef0123456789abcdef01234567",
  });
  assert.equal(mismatched.status, 1);

  const approved = runGuardProcess({
    COMMIT_REF: exactCommit,
    STUDIOFLOW_PRODUCTION_RELEASE_COMMIT: exactCommit,
  });
  assert.equal(approved.status, 0);
  assert.match(approved.stdout, /matches this exact commit/i);
});

test("Netlify keeps previews on the normal build and production behind both guards", () => {
  const config = readFileSync(netlifyConfigPath, "utf8");
  const defaultBuild = config.match(/^\[build\]\s*([\s\S]*?)(?=^\[|\z)/m)?.[1] ?? "";
  const production = config.match(/^\[context\.production\]\s*([\s\S]*?)(?=^\[|\z)/m)?.[1] ?? "";

  assert.match(defaultBuild, /command\s*=\s*"npm run build"/);
  assert.match(production, /ignore\s*=\s*"exit 0"/);
  assert.match(production, /command\s*=\s*"node scripts\/netlify-production-guard\.mjs && npm run build"/);
  assert.doesNotMatch(config, /^\[context\.deploy-preview\]/m);
});
