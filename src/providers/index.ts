import { LLMProvider, LLMProviderConfig, LLMProviderType } from "../types/llm";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

export { BaseLLMProvider } from "./base-provider";
export { OpenAIProvider } from "./openai-provider";
export { AnthropicProvider } from "./anthropic-provider";

/**
 * Factory function to create an LLM provider based on type
 * @param type The type of provider to create
 * @param config Configuration for the provider
 * @returns An instance of the requested provider
 */
export function createProvider(
  type: LLMProviderType,
  config: LLMProviderConfig
): LLMProvider {
  switch (type) {
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * LLM Service for managing providers
 */
export class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProviderName: string | null = null;

  /**
   * Register a provider with the service
   * @param name Name to register the provider under
   * @param provider The provider instance
   * @param isDefault Whether this should be the default provider
   */
  registerProvider(
    name: string,
    provider: LLMProvider,
    isDefault = false
  ): void {
    this.providers.set(name, provider);
    if (isDefault || this.providers.size === 1) {
      this.defaultProviderName = name;
    }
  }

  /**
   * Set the default provider by name
   * @param name Name of the provider to set as default
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" not registered`);
    }
    this.defaultProviderName = name;
  }

  /**
   * Get a provider by name, or the default provider
   * @param name Optional name of the provider to get
   * @returns The requested provider
   */
  getProvider(name?: string): LLMProvider {
    const providerName = name || this.defaultProviderName;
    if (!providerName) {
      throw new Error("No provider specified and no default provider set");
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider "${providerName}" not found`);
    }

    return provider;
  }

  /**
   * Evaluate a screenshot using the specified or default provider
   * @param screenshotPath Path to the screenshot
   * @param specification Specification to evaluate against
   * @param providerName Optional provider name
   * @param options Evaluation options
   * @returns LLM response
   */
  async evaluateScreenshot(
    screenshotPath: string,
    specification: string,
    providerName?: string,
    options?: Parameters<LLMProvider["evaluateScreenshot"]>[2]
  ): ReturnType<LLMProvider["evaluateScreenshot"]> {
    const provider = this.getProvider(providerName);
    return provider.evaluateScreenshot(screenshotPath, specification, options);
  }
}
