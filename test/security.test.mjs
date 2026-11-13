import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createSessionToken,
  decryptCpf,
  encryptCpf,
  hashPassword,
  hashSessionToken,
  normalizeCpf,
  verifyPassword,
} from "../dist/security/security.js";

process.env.CPF_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("normaliza e cifra CPF sem armazenar o valor em texto puro", () => {
  const cpf = "000.000.000-01";
  const encrypted = encryptCpf(cpf);
  assert.notEqual(encrypted, cpf);
  assert.match(encrypted, /^enc:v1:/);
  assert.equal(decryptCpf(encrypted), normalizeCpf(cpf));
});

test("hash HMAC de sessão é determinístico e não é o token", () => {
  const token = createSessionToken();
  assert.equal(token.length, 43);
  assert.notEqual(hashSessionToken(token), token);
  assert.equal(hashSessionToken(token), hashSessionToken(token));
});

test("hash scrypt valida senha correta e rejeita senha incorreta", async () => {
  const hash = await hashPassword("senha-de-teste");
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword("senha-de-teste", hash), true);
  assert.equal(await verifyPassword("senha-errada", hash), false);
});

test("contas e CPFs fictícios do init.sql usam hashes e cifras verificáveis", async () => {
  const sql = await readFile(new URL("../init.sql", import.meta.url), "utf8");
  const passwordHashes = sql.match(/scrypt\$[^']+/g) ?? [];
  assert.equal(passwordHashes.length, 3);
  for (const hash of passwordHashes) assert.equal(await verifyPassword("Assist@123", hash), true);

  const encryptedCpfs = [...sql.matchAll(/'(enc:v1:[^']+)', '([a-f0-9]{64})'/g)];
  assert.equal(encryptedCpfs.length, 3);
  for (const [, encrypted, expectedHash] of encryptedCpfs) {
    const cpf = decryptCpf(encrypted);
    assert.match(cpf, /^\d{11}$/);
    const { cpfLookupHash } = await import("../dist/security/security.js");
    assert.equal(cpfLookupHash(cpf), expectedHash);
  }
});
