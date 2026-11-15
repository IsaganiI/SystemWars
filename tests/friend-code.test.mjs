import test from "node:test";
import assert from "node:assert/strict";
import { FRIEND_CODE_ALPHABET, FRIEND_CODE_LENGTH, formatFriendCode, generateFriendCode, normalizeFriendCode } from "../src/lib/friend-code.ts";

test("friend codes use only unambiguous characters and the full length", () => {
  for (let index = 0; index < 500; index++) {
    const code = generateFriendCode();
    assert.equal(code.length, FRIEND_CODE_LENGTH);
    for (const character of code) assert.ok(FRIEND_CODE_ALPHABET.includes(character), `unexpected ${character}`);
    assert.doesNotMatch(code, /[01ILO]/);
  }
});

test("friend codes are random enough not to repeat", () => {
  const seen = new Set(Array.from({ length: 5000 }, generateFriendCode));
  assert.equal(seen.size, 5000);
});

test("formatting and typing a code round-trips", () => {
  const code = generateFriendCode();
  const shown = formatFriendCode(code);
  assert.match(shown, /^SW-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.equal(normalizeFriendCode(shown), code);
  assert.equal(normalizeFriendCode(shown.toLowerCase()), code);
  assert.equal(normalizeFriendCode(` ${code.slice(0, 4)} ${code.slice(4, 8)} ${code.slice(8)} `), code);
  assert.equal(normalizeFriendCode(code), code);
});

test("invalid codes are rejected", () => {
  assert.equal(normalizeFriendCode(""), null);
  assert.equal(normalizeFriendCode("SW-AAAA-AAAA"), null);
  assert.equal(normalizeFriendCode("SW-AAAA-AAAA-AAA0"), null);
  assert.equal(normalizeFriendCode("SW-AAAA-AAAA-AAAI"), null);
  assert.equal(normalizeFriendCode("x".repeat(41)), null);
});
