import type { Env } from "../env.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 } as const;
type Level = Exclude<keyof typeof LEVELS, "silent">;

export type Logger = Record<Level, (msg: string, fields?: Record<string, unknown>) => void>;

/** One JSON object per line, so hosted log drains can index fields. */
export function createLogger(level: Env["LOG_LEVEL"]): Logger {
  const min = LEVELS[level];
  const write = (lvl: Level) => (msg: string, fields?: Record<string, unknown>) => {
    if (LEVELS[lvl] < min) return;
    const line = JSON.stringify({ level: lvl, time: new Date().toISOString(), msg, ...fields });
    (lvl === "error" || lvl === "warn" ? process.stderr : process.stdout).write(line + "\n");
  };
  return { debug: write("debug"), info: write("info"), warn: write("warn"), error: write("error") };
}
