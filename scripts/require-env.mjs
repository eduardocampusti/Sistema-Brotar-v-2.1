import 'dotenv/config';

/**
 * Reads a mandatory server/script environment variable without logging its value.
 */
export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
