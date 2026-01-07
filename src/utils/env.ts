/**
 * Environment variable utilities for the LLM integration
 * Responsible for loading, validating, and accessing environment variables
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Get an environment variable
 * @param key The environment variable key
 * @param defaultValue Optional default value if the environment variable is not set
 * @returns The environment variable value or the default value
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Get an API key from environment variables
 * Checks the specified environment variable and returns its value
 *
 * @param envVarName Name of the environment variable containing the API key
 * @returns The API key or undefined if not set
 */
export function getApiKey(envVarName: string): string | undefined {
  const apiKey = getEnv(envVarName);

  if (!apiKey) {
    console.warn(
      `[${envVarName}] No API key provided. Set ${envVarName} environment variable.`
    );
    return undefined;
  }

  return apiKey;
}

/**
 * Environment variable names used in the application
 */
export const ENV_VARS = {
  OPENAI_API_KEY: "OPENAI_API_KEY",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  VIBE_DEFAULT_PROVIDER: "VIBE_DEFAULT_PROVIDER",
  NODE_ENV: "NODE_ENV",
};

/**
 * Validate required environment variables and log warnings for missing ones
 */
export function validateEnv(): void {
  function hasEnv(key: string): boolean {
    return !!process.env[key];
  }

  const isProd = getEnv(ENV_VARS.NODE_ENV) === "production";

  if (isProd) {
    // In production, we need at least one API key
    const hasAnyApiKey =
      hasEnv(ENV_VARS.OPENAI_API_KEY) || hasEnv(ENV_VARS.ANTHROPIC_API_KEY);

    if (!hasAnyApiKey) {
      console.error(
        "No API keys provided. At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY must be set in production."
      );
    }
  }
}
