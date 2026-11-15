import type { Mode } from "@/lib/game-types";

/** Timings for one ranked match. The server owns every deadline; clients only display them. */
export const PACE = {
  /** Every player gets this long to accept a found match. */
  readyCheckSeconds: 30,
  /** Server-only buffer for slow polling, tabs waking from sleep, and an in-flight accept request. */
  readyCheckGraceSeconds: 10,
  /** Build time starts when the last player confirms the brief. */
  buildSeconds: { "1v1": 300, "2v2": 360, "3v3": 420 } satisfies Record<Mode, number>,
  /** The clock turns into a warning for the final stretch. */
  warningSeconds: 30,
  /** Late submissions are accepted for this long after 0:00 (network delay). After that the server locks absent teams in. */
  submitGraceSeconds: 10,
  /** An auto-submit (half-built canvas allowed) is only accepted this close to 0:00. */
  autoSubmitEarlyMs: 3000,
} as const;

export function readyCheckEndsAt(createdAt: number) {
  return createdAt + PACE.readyCheckSeconds * 1000;
}

export function readyCheckExpiresAt(createdAt: number) {
  return readyCheckEndsAt(createdAt) + PACE.readyCheckGraceSeconds * 1000;
}

export function isReadyCheckExpired(createdAt: number, now: number) {
  return now >= readyCheckExpiresAt(createdAt);
}

export function formatClock(milliseconds: number) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}
