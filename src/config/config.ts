import { LLMProviderConfig, LLMProviderType } from "../types/llm";

/**
 * Unified configuration for the visual testing framework
 */
export interface VibeConfig {
  /** Default LLM provider to use */
  defaultProvider: string;

  /** Configuration for all providers */
  providers: {
    [name: string]: {
      /** Type of the provider */
      type: LLMProviderType;

      /** Configuration for the provider */
      config: LLMProviderConfig;
    };
  };

  /** Default evaluation options */
  evaluation: {
    /** Default confidence threshold (0-1) */
    confidenceThreshold: number;

    /** Whether to include raw LLM responses in the results */
    includeRawResponse: boolean;

    /** Maximum number of retries for LLM calls */
    maxRetries: number;

    /** Additional model parameters to pass to the LLM */
    modelParameters: Record<string, unknown>;
  };
}

/**
 * Options that can be passed to vibeCheck
 */
export interface VibeCheckOptions {
  /** Custom name for the screenshot */
  name?: string;

  /** LLM provider to use for this check */
  provider?: "openai" | "anthropic";

  /** Confidence threshold for this check (0-1) */
  confidenceThreshold?: number;

  /** Whether to include raw LLM response in the result */
  includeRawResponse?: boolean;

  /** Maximum retries for LLM API calls */
  maxRetries?: number;

  /** Additional model parameters */
  modelParameters?: Record<string, unknown>;
}

/**
 * Default configuration for the framework
 * This can be overridden by environment variables or per-check options
 */
export function createDefaultConfig(): VibeConfig {
  return {
    defaultProvider: process.env.VIBE_DEFAULT_PROVIDER || "openai",
    providers: {
      openai: {
        type: "openai",
        config: {
          apiKey: process.env.OPENAI_API_KEY || "",
          defaultConfidenceThreshold: 0.6,
        },
      },
      anthropic: {
        type: "anthropic",
        config: {
          apiKey: process.env.ANTHROPIC_API_KEY || "",
          defaultConfidenceThreshold: 0.6,
        },
      },
    },
    evaluation: {
      confidenceThreshold: 0.8,
      includeRawResponse: false,
      maxRetries: 2,
      modelParameters: {},
    },
  };
}

/**
 * Merge user config with defaults
 */
export function mergeConfig(
  userConfig: Partial<VibeConfig>
): VibeConfig {
  const defaultConfig = createDefaultConfig();

  return {
    defaultProvider: userConfig.defaultProvider ?? defaultConfig.defaultProvider,
    providers: {
      ...defaultConfig.providers,
      ...userConfig.providers,
    },
    evaluation: {
      ...defaultConfig.evaluation,
      ...userConfig.evaluation,
    },
  };
}
