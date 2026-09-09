import { createDecipheriv } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const [inputPath, outputPath, mode] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: npm run backup:decrypt -- <encrypted-file> <output-json> [--workspace]');
  process.exit(1);
}

const encodedKey = process.env.BACKUP_ENCRYPTION_KEY;
if (!encodedKey) throw new Error('Set BACKUP_ENCRYPTION_KEY for this process before decrypting.');
const key = Buffer.from(encodedKey, 'base64');
if (key.byteLength !== 32)
  throw new Error('BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes.');

const envelope = await readFile(inputPath);
if (envelope.byteLength < 29) throw new Error('The encrypted backup envelope is too short.');
const nonce = envelope.subarray(0, 12);
const tag = envelope.subarray(envelope.byteLength - 16);
const ciphertext = envelope.subarray(12, envelope.byteLength - 16);
const decipher = createDecipheriv('aes-256-gcm', key, nonce);
decipher.setAuthTag(tag);
const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
const backup = JSON.parse(plaintext.toString('utf8'));
const output = mode === '--workspace' ? backup.workspace : backup;
if (!output) throw new Error('This backup does not contain an import-compatible workspace.');
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
console.log(`Decrypted backup written to ${outputPath}`);
