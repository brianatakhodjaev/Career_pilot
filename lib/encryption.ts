// Amendment 6 Stage 3 — AES-256-GCM encryption for sensitive at-rest
// secrets, specifically UserSettings.byoApiKey.
//
// Decision D: key from process.env.BYO_ENCRYPTION_KEY (32 bytes
// base64). Generate per environment via
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Production deploy: set BYO_ENCRYPTION_KEY in Vercel env vars BEFORE
// any production user saves a BYO key — otherwise the encrypt() call
// throws and the save fails loudly (intended).
//
// Wire format: base64(iv) ":" base64(ciphertext) ":" base64(authTag)
// — three fields, colon-separated. IV is 12 bytes (GCM standard).
// Auth tag is 16 bytes. Storing as a single text column on
// UserSettings.byoApiKey.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // bytes
const IV_LENGTH = 12; // bytes (GCM standard)

function getKey(): Buffer {
  const raw = process.env.BYO_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "BYO_ENCRYPTION_KEY is not set. Generate a 32-byte base64 key and add it to .env (dev) and Vercel env vars (prod) before any BYO key save is attempted.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `BYO_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes; got ${key.length}.`,
    );
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${ciphertext.toString("base64")}:${authTag.toString("base64")}`;
}

export function decrypt(blob: string): string {
  const key = getKey();
  const parts = blob.split(":");
  if (parts.length !== 3) {
    throw new Error("Encrypted blob is malformed (expected iv:ciphertext:tag).");
  }
  const [ivB64, ctB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_LENGTH) {
    throw new Error(`IV length mismatch (expected ${IV_LENGTH}, got ${iv.length}).`);
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
