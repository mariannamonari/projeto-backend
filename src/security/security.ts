import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const key = (): Buffer => {
  const value = process.env.CPF_ENCRYPTION_KEY ?? "";
  if (!/^[\da-fA-F]{64}$/.test(value)) {
    throw new Error("CPF_ENCRYPTION_KEY deve conter exatamente 64 caracteres hexadecimais.");
  }
  return Buffer.from(value, "hex");
};

export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function encryptCpf(cpf: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(normalizeCpf(cpf), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

export function decryptCpf(value: string): string {
  if (!value.startsWith("enc:v1:")) throw new Error("Formato de CPF criptografado inválido.");
  const payload = Buffer.from(value.slice("enc:v1:".length), "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function cpfLookupHash(cpf: string): string {
  return createHmac("sha256", key()).update(normalizeCpf(cpf)).digest("hex");
}

export function maskCpf(cpf: string): string {
  return `***.***.***-${cpf.slice(-2)}`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !hashText) return false;
  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a scrypt-compatible hash for the three demo accounts in init.sql. */
export function demoPasswordHash(saltHex: string, password = "Assist@123"): string {
  const salt = Buffer.from(saltHex, "hex");
  return `scrypt$${salt.toString("base64url")}$${scryptSync(password, salt, 64).toString("base64url")}`;
}