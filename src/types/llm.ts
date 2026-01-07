/**
 * Standardized response format from any LLM provider
 */
export interface LLMResponse {
  /** Whether the UI matches the specification (yes) or not (no) */
  verdict: "yes" | "no";

  /** Confidence level from 0.0 to 1.0 */
  confidence: number;

  /** Reason for failure if verdict is "no" */
  failReason?: string;

  /** Detailed reasoning behind the decision */
  reasoning?: string;

  /** Suggestions for improving the UI or fixing issues */
  suggestions?: string[];

  /** Raw response from the LLM provider (for debugging) */
  rawResponse?: unknown;
}

/**
 * Options for the evaluateScreenshot method
 */
export interface EvaluateOptions {
  /** Confidence threshold from 0.0 to 1.0. If the LLM's confidence is below this, the test will fail. */
  confidenceThreshold?: number;

  /** Model-specific parameters to pass to the LLM provider */
  modelParameters?: Record<string, unknown>;

  /** Whether to include the raw LLM response in the result */
  includeRawResponse?: boolean;

  /** Maximum attempts to retry on API failure or malformed response */
  maxRetries?: number;
}

/**
 * Base interface for all LLM providers
 */
export interface LLMProvider {
  /**
   * Evaluates a screenshot against a specification using an LLM
   * @param screenshotPath Path to the screenshot file
   * @param specification Text specification to evaluate against
   * @param options Evaluation options
   * @returns Promise with the LLM's response
   */
  evaluateScreenshot(
    screenshotPath: string,
    specification: string,
    options?: EvaluateOptions
  ): Promise<LLMResponse>;
}

/**
 * Configuration options for LLM providers
 */
export interface LLMProviderConfig {
  /** API key for the LLM provider */
  apiKey?: string;

  /** Environment variable name containing the API key */
  apiKeyEnvVar?: string;

  /** Default confidence threshold */
  defaultConfidenceThreshold?: number;

  /** Default retry count */
  defaultMaxRetries?: number;

  /** Model ID or name to use */
  model?: string;

  /** Maximum tokens in the response */
  maxTokens?: number;

  /** Temperature for response generation */
  temperature?: number;

  /** Provider-specific parameters */
  [key: string]: unknown;
}

/**
 * Available LLM provider types
 */
export type LLMProviderType = "anthropic" | "openai" | "custom";
