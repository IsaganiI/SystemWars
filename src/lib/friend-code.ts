import { randomInt } from "node:crypto";

/**
 * Friend codes, like Game Center's: a private, random code a player shares with people they want to play with.
 * The alphabet leaves out look-alike characters (0/O, 1/I/L) so codes are easy to read aloud and type.
 * 12 characters from 31 symbols is about 59 bits of randomness, so codes cannot be guessed; the server also
 * rate-limits lookups. This file has no database access so it can be unit-tested directly.
 */
export const FRIEND_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const FRIEND_CODE_LENGTH = 12;
const PREFIX = "SW";

/** A new random code (12 characters, no separators). Uses a cryptographically secure, unbiased generator. */
export function generateFriendCode() {
  let code = "";
  for (let index = 0; index < FRIEND_CODE_LENGTH; index++) code += FRIEND_CODE_ALPHABET[randomInt(FRIEND_CODE_ALPHABET.length)];
  return code;
}

/** Display form: SW-XXXX-XXXX-XXXX. */
export function formatFriendCode(code: string) {
  return `${PREFIX}-${code.match(/.{1,4}/g)?.join("-") ?? code}`;
}

/**
 * Accepts what a person types or pastes (any case, with or without the SW- prefix, spaces or dashes) and
 * returns the stored form, or null if it cannot be a valid code.
 */
export function normalizeFriendCode(input: string) {
  if (input.length > 40) return null;
  let code = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (code.length === FRIEND_CODE_LENGTH + PREFIX.length && code.startsWith(PREFIX)) code = code.slice(PREFIX.length);
  if (code.length !== FRIEND_CODE_LENGTH) return null;
  for (const character of code) if (!FRIEND_CODE_ALPHABET.includes(character)) return null;
  return code;
}
