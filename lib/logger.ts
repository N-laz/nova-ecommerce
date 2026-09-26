/* Minimal structured logger — swap for pino/Datadog/Sentry in production. */
type Level = "info" | "warn" | "error";

function log(level: Level, context: string, detail?: unknown) {
  const entry = {
    level,
    context,
    time: new Date().toISOString(),
    ...(detail instanceof Error ? { error: detail.message, stack: detail.stack } : detail !== undefined ? { detail } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (context: string, detail?: unknown) => log("info", context, detail),
  warn: (context: string, detail?: unknown) => log("warn", context, detail),
  error: (context: string, detail?: unknown) => log("error", context, detail),
};
