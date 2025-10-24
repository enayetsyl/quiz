import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const SALT_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 64;

export const hashPassword = async (password: string) => {
  const salt = randomBytes(SALT_LENGTH_BYTES).toString("hex");
  const derivedKey = await scrypt(password, salt, KEY_LENGTH_BYTES);

  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
};

export const verifyPassword = async (password: string, storedHash: string) => {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, KEY_LENGTH_BYTES);
  const keyBuffer = Buffer.from(key, "hex");

  if (keyBuffer.length !== (derivedKey as Buffer).length) {
    return false;
  }

  return timingSafeEqual(keyBuffer, derivedKey as Buffer);
};
