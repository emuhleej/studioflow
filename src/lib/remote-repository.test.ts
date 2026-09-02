import { describe, expect, it } from "vitest";
import { fromDatabaseRecord, getRemoteUpsertOptions, toDatabaseRecord } from "./remote-repository";

describe("remote repository mapping", () => {
  it("round-trips client and database field names", () => {
    const client = { ownerId: "owner", targetType: "generation", targetId: "generation-1" };
    expect(fromDatabaseRecord(toDatabaseRecord(client))).toEqual(client);
  });

  it("reconciles asset links by their natural relationship during restore", () => {
    expect(getRemoteUpsertOptions("assetLinks")).toEqual({ onConflict: "asset_id,target_type,target_id" });
    expect(getRemoteUpsertOptions("generations")).toBeUndefined();
  });
});
