export type SlowSyncSettings = {
  minDelayMs: number;
  maxDelayMs: number;
};

export const defaultSlowSyncSettings: SlowSyncSettings = {
  minDelayMs: 8000,
  maxDelayMs: 16000,
};

export function randomDelayMs(settings = defaultSlowSyncSettings) {
  const min = settings.minDelayMs;
  const max = settings.maxDelayMs;

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}