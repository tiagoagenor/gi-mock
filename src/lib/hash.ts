import { createHash, randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";

// Hash curto (URL-safe) usado como identificador rápido de cada endpoint.
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const shortHash = customAlphabet(ALPHABET, 12);

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// API key: prefixo visível + segredo. Retorna a key completa e os campos a salvar.
export function generateApiKey(): {
  fullKey: string;
  prefix: string;
  keyHash: string;
} {
  const prefix = `mk_${customAlphabet(ALPHABET, 8)()}`;
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${prefix}_${secret}`;
  return { fullKey, prefix, keyHash: sha256(fullKey) };
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
