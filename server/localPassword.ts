import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export function validateLocalPassword(password: string) {
  if (password.length < 10) return "A senha deve ter ao menos 10 caracteres.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "A senha deve combinar letras e números.";
  }
  return null;
}

export async function hashLocalPassword(password: string) {
  const validationError = validateLocalPassword(password);
  if (validationError) throw new Error(validationError);

  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyLocalPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const [algorithm, salt, expectedHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;

  try {
    const expected = Buffer.from(expectedHex, "hex");
    const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
