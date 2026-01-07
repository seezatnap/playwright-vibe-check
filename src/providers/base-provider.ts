import {
  EvaluateOptions,
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
} from "../types/llm";
import { pathExists, readFileAsBase64 } from "../utils/fs-utils";

/**
 * Abstract base class for all LLM providers
 * Handles common functionality like error handling, retries, and configuration
 */
export abstract class BaseLLMProvider implements LLMProvider {
  /** Configuration options for the provider */
  protected config: LLMProviderConfig;

  /** Name of this provider for logging/identification */
  protected abstract providerName: string;

  /**
   * Creates a new instance of the BaseLLMProvider
   * @param config Configuration options
   */
  constructor(config: LLMProviderConfig) {
    this.config = this.validateConfig(config);
  }

  /**
   * Validates the provider configuration and sets defaults
   * @param config Configuration to validate
   * @returns Validated configuration with defaults applied
   */
  protected validateConfig(config: LLMProviderConfig): LLMProviderConfig {
    const validatedConfig: LLMProviderConfig = { ...config };

    // Check for API key or environment variable
    if (!validatedConfig.apiKey && validatedConfig.apiKeyEnvVar) {
      validatedConfig.apiKey = process.env[validatedConfig.apiKeyEnvVar] || "";
    }

    if (!validatedConfig.apiKey) {
      console.warn(
        `[${this.providerName}] No API key provided. Set config.apiKey or config.apiKeyEnvVar.`
      );
    }

    // Set default values
    validatedConfig.defaultConfidenceThreshold =
      validatedConfig.defaultConfidenceThreshold || 0.8;
    validatedConfig.defaultMaxRetries = validatedConfig.defaultMaxRetries || 3;
    validatedConfig.temperature = validatedConfig.temperature || 0.3;

    return validatedConfig;
  }

  /**
   * Evaluates a screenshot against a specification using the LLM
   * Includes retry logic and error handling
   * @param screenshotPath Path to screenshot file
   * @param specification Specification text to evaluate against
   * @param options Evaluation options
   * @returns LLM response
   */
  async evaluateScreenshot(
    screenshotPath: string,
    specification: string,
    options?: EvaluateOptions
  ): Promise<LLMResponse> {
    if (!(await pathExists(screenshotPath))) {
      throw new Error(`Screenshot does not exist at path: ${screenshotPath}`);
    }

    // Merge options with defaults
    const mergedOptions: EvaluateOptions = {
      confidenceThreshold: this.config.defaultConfidenceThreshold,
      maxRetries: this.config.defaultMaxRetries,
      ...options,
    };

    let lastError: Error | null = null;

    // Attempt with retries
    for (
      let attempt = 1;
      attempt <= (mergedOptions.maxRetries || 1);
      attempt++
    ) {
      try {
        if (attempt > 1) {
          console.log(
            `[${this.providerName}] Retry attempt ${attempt}/${mergedOptions.maxRetries}`
          );
        }

        const result = await this.evaluateScreenshotInternal(
          screenshotPath,
          specification,
          mergedOptions
        );

        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[${this.providerName}] Error (attempt ${attempt}/${mergedOptions.maxRetries}):`,
          error
        );

        if (attempt >= (mergedOptions.maxRetries || 1)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
        );
      }
    }

    throw (
      lastError ||
      new Error(`Unknown error evaluating screenshot with ${this.providerName}`)
    );
  }

  /**
   * Provider-specific implementation for evaluating a screenshot
   * @param screenshotPath Path to screenshot file
   * @param specification Specification text to evaluate against
   * @param options Evaluation options
   * @returns LLM response
   */
  protected abstract evaluateScreenshotInternal(
    screenshotPath: string,
    specification: string,
    options: EvaluateOptions
  ): Promise<LLMResponse>;

  /**
   * Utility function to read a file as base64
   * @param filePath Path to the file
   * @returns Base64 encoded file content
   */
  protected async getImageAsBase64(filePath: string): Promise<string> {
    return readFileAsBase64(filePath);
  }

  /**
   * Utility function to create a standardized system prompt
   * @param specification Specification text
   * @returns System prompt text
   */
  protected getSystemPrompt(specification: string): string {
    return `You are a visual UI testing assistant. Analyze the image and determine if it meets the specification.
Use a scale from 0.0 to 1.0 where:
- 1.0 means the UI perfectly matches the specification
- 0.0 means the UI completely fails to match the specification

Format your answer as JSON with these fields:
- confidence: number from 0.0 to 1.0
- reasoning: your step-by-step explanation
- verdict: string, "yes" if the UI matches the specification, "no" if it doesn't
- failReason: string, if verdict is "no", explain why it fails (omit if verdict is "yes")
- suggestions: array of strings, optional suggestions for improvement

SPECIFICATION:
${specification}

Analyze carefully and be honest about the confidence score.`;
  }
}
