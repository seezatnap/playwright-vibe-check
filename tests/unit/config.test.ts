import { test, expect } from "@playwright/test";
import { createDefaultConfig, mergeConfig } from "../../src/config/config";

test.describe("Configuration", () => {
  test("createDefaultConfig returns valid default config", () => {
    const config = createDefaultConfig();

    expect(config.defaultProvider).toBe("openai");
    expect(config.providers.openai).toBeDefined();
    expect(config.providers.anthropic).toBeDefined();
    expect(config.evaluation.confidenceThreshold).toBe(0.8);
    expect(config.evaluation.includeRawResponse).toBe(false);
    expect(config.evaluation.maxRetries).toBe(2);
  });

  test("mergeConfig merges user config with defaults", () => {
    const userConfig = {
      defaultProvider: "anthropic",
      evaluation: {
        confidenceThreshold: 0.9,
        includeRawResponse: true,
        maxRetries: 5,
        modelParameters: { temperature: 0.5 },
      },
    };

    const merged = mergeConfig(userConfig);

    expect(merged.defaultProvider).toBe("anthropic");
    expect(merged.evaluation.confidenceThreshold).toBe(0.9);
    expect(merged.evaluation.includeRawResponse).toBe(true);
    expect(merged.evaluation.maxRetries).toBe(5);
    // Original providers should still be there
    expect(merged.providers.openai).toBeDefined();
    expect(merged.providers.anthropic).toBeDefined();
  });

  test("mergeConfig preserves defaults when user config is empty", () => {
    const merged = mergeConfig({});

    expect(merged.defaultProvider).toBe("openai");
    expect(merged.evaluation.confidenceThreshold).toBe(0.8);
  });
});
