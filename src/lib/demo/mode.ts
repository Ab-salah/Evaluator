/**
 * Demo mode (DEMO_MODE=true): the AI is simulated, so no API key or internet
 * is needed, and sample shops and audits are loaded so every screen has
 * data. Meant for trying the app out, never for real audits.
 */
export const DEMO_MODE = ["1", "true", "yes", "on"].includes((process.env.DEMO_MODE ?? "").trim().toLowerCase());
