import { openDB } from "idb";

const prefix = "studioflow-asset:";
const database = openDB("studioflow-private-media", 1, {
  upgrade(db) {
    db.createObjectStore("asset-blobs");
  },
});

export async function saveAssetBlob(assetId: string, blob: Blob): Promise<void> {
  await (await database).put("asset-blobs", blob, `${prefix}${assetId}`);
}

export async function loadAssetBlob(assetId: string): Promise<Blob | undefined> {
  return (await database).get("asset-blobs", `${prefix}${assetId}`);
}

export async function deleteAssetBlob(assetId: string): Promise<void> {
  await (await database).delete("asset-blobs", `${prefix}${assetId}`);
}
