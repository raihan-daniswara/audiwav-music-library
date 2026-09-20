import type { LyricLine } from "./types";

const LRC_TIMESTAMP = /^\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

function timestampToMs(
  minutes: string,
  seconds: string,
  fraction?: string,
): number {
  const minuteMs = Number(minutes) * 60_000;
  const secondMs = Number(seconds) * 1_000;

  if (!fraction) {
    return minuteMs + secondMs;
  }

  const fractionMs =
    fraction.length === 1
      ? Number(fraction) * 100
      : fraction.length === 2
        ? Number(fraction) * 10
        : Number(fraction.slice(0, 3));

  return minuteMs + secondMs + fractionMs;
}

export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const rawLine of lrc.split(/\r?\n/)) {
    const match = rawLine.match(LRC_TIMESTAMP);

    if (!match) {
      continue;
    }

    const minutes = match[1];
    const seconds = match[2];
    const fraction = match[3];
    const text = match[4];

    if (minutes === undefined || seconds === undefined || text === undefined) {
      continue;
    }

    lines.push({
      text: text.trim(),
      startMs: timestampToMs(minutes, seconds, fraction),
    });
  }

  lines.sort((a, b) => a.startMs - b.startMs);

  for (let index = 0; index < lines.length - 1; index++) {
    const current = lines[index];
    const next = lines[index + 1];

    if (current && next) {
      current.endMs = next.startMs;
    }
  }

  return lines;
}
