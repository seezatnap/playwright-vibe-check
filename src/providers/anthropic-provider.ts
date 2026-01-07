/**
 * Anthropic provider implementation for the LLM service
 * Uses Anthropic's Claude vision capabilities to evaluate images
 */
import { LLMProviderConfig, LLMResponse, EvaluateOptions } from "../types/llm";
import { BaseLLMProvider } from "./base-provider";
import { ENV_VARS, getApiKey } from "../utils/env";

/**
 * Configuration options specific to the Anthropic provider
 */
export interface AnthropicProviderConfig extends LLMProviderConfig {
  /** Anthropic model to use, default is claude-sonnet-4-5-20250929 */
  model?: string;
}

/**
 * Anthropic (Claude) implementation of the LLM provider
 * Uses Anthropic's Claude Sonnet 4.5 vision capabilities to evaluate images
 */
export class AnthropicProvider extends BaseLLMProvider {
  /** Default model to use for Anthropic API calls */
  private static readonly DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

  /** Name of this provider */
  protected providerName = "Anthropic";

  /**
   * Creates a new instance of the Anthropic provider
   * @param config Configuration for this provider
   */
  constructor(config: AnthropicProviderConfig) {
    super(config);
  }

  /**
   * Validates the Anthropic provider configuration
   * @param config Configuration to validate
   * @returns Validated configuration
   */
  protected validateConfig(
    config: AnthropicProviderConfig
  ): AnthropicProviderConfig {
    const validatedConfig = super.validateConfig(
      config
    ) as AnthropicProviderConfig;

    validatedConfig.model =
      validatedConfig.model || AnthropicProvider.DEFAULT_MODEL;

    return validatedConfig;
  }

  /**
   * Anthropic-specific implementation for evaluating a screenshot
   * @param screenshotPath Path to the screenshot file
   * @param specification Text specification to evaluate against
   * @param options Additional options for the evaluation
   * @returns Result of the evaluation
   */
  protected async evaluateScreenshotInternal(
    screenshotPath: string,
    specification: string,
    options: EvaluateOptions
  ): Promise<LLMResponse> {
    const config = this.config as AnthropicProviderConfig;
    const systemPrompt = this.getSystemPrompt(specification);
    const base64Image = await this.getImageAsBase64(screenshotPath);

    if (!base64Image) {
      throw new Error(`Could not read screenshot file: ${screenshotPath}`);
    }

    const apiKey = this.config.apiKey || getApiKey(ENV_VARS.ANTHROPIC_API_KEY);
    if (!apiKey) {
      throw new Error(
        "No Anthropic API key provided. Please check your environment variables."
      );
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model || AnthropicProvider.DEFAULT_MODEL,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Evaluate if this UI element matches the specification.",
                },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 1500,
          ...(options.modelParameters || {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: unknown };
        let errorMessage = `API request failed with status ${response.status}`;

        if (errorData.error) {
          errorMessage += `: ${JSON.stringify(errorData.error)}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json() as {
        content?: Array<{ type: string; text?: string }>;
      };
      let content = "";

      if (
        data &&
        data.content &&
        Array.isArray(data.content) &&
        data.content.length > 0
      ) {
        const contentBlock = data.content.find(
          (block: { type: string }) => block.type === "text"
        );

        if (contentBlock && contentBlock.text) {
          content = contentBlock.text;
        }
      }

      // Try to extract JSON from the response content
      let resultJson: Record<string, unknown> = {};

      try {
        const jsonMatch = content.match(/(\{[\s\S]*\})/);
        if (jsonMatch && jsonMatch[0]) {
          resultJson = JSON.parse(jsonMatch[0]);
        } else {
          resultJson = JSON.parse(content);
        }
      } catch (error) {
        console.error("[Anthropic] Failed to parse response JSON:", error);
        resultJson = {
          confidence: 0,
          reasoning: `Error parsing response: ${content}`,
          verdict: "no",
        };
      }

      if (!("confidence" in resultJson)) {
        console.log("[Anthropic] Could not access response content");
        return {
          confidence: 0,
          reasoning: `Invalid response format: ${JSON.stringify(resultJson)}`,
          verdict: "no",
          rawResponse: options.includeRawResponse ? data : undefined,
        };
      }

      return {
        confidence: resultJson.confidence as number,
        reasoning: (resultJson.reasoning as string) || "No reasoning provided",
        verdict: (resultJson.verdict as "yes" | "no") || "no",
        failReason: resultJson.failReason as string | undefined,
        suggestions: resultJson.suggestions as string[] | undefined,
        rawResponse: options.includeRawResponse ? data : undefined,
      };
    } catch (error) {
      console.error("[Anthropic] API error:", error);

      const errorMessage = (error as Error).message || "";
      if (errorMessage.includes("401")) {
        console.error(
          "[Anthropic] Authentication error: Invalid API key. Please check your ANTHROPIC_API_KEY."
        );
      }

      throw error;
    }
  }
}
