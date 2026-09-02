import type { BaseRecord } from "../types";

export async function saveWithRetry(save: () => Promise<void>, attempts = 2): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await save();
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function rollbackAppendedRecord<T extends BaseRecord>(records: T[], attempted: T): T[] {
  return records.filter((record) => record !== attempted);
}

export function rollbackUpdatedRecord<T extends BaseRecord>(records: T[], attempted: T, previous: T): T[] {
  return records.map((record) => record === attempted ? previous : record);
}
