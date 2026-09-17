import { mkdirSync } from "node:fs";

export const baseURL = process.env.ECG_BASE_URL || "http://127.0.0.1:5173";
export const launchOptions = {
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
};
mkdirSync("test-results", { recursive: true });
