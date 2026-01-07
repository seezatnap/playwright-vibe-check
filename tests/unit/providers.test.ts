import { test, expect } from "@playwright/test";
import { LLMService, createProvider } from "../../src/providers";

test.describe("LLM Providers", () => {
  test("createProvider creates OpenAI provider", () => {
    const provider = createProvider("openai", { apiKey: "test-key" });
    expect(provider).toBeDefined();
    expect(typeof provider.evaluateScreenshot).toBe("function");
  });

  test("createProvider creates Anthropic provider", () => {
    const provider = createProvider("anthropic", { apiKey: "test-key" });
    expect(provider).toBeDefined();
    expect(typeof provider.evaluateScreenshot).toBe("function");
  });

  test("createProvider throws for unknown provider type", () => {
    expect(() => {
      // @ts-expect-error Testing invalid input
      createProvider("unknown", {});
    }).toThrow("Unknown provider type");
  });
});

test.describe("LLM Service", () => {
  test("LLMService registers and retrieves providers", () => {
    const service = new LLMService();
    const provider = createProvider("openai", { apiKey: "test-key" });

    service.registerProvider("test-openai", provider);

    const retrieved = service.getProvider("test-openai");
    expect(retrieved).toBe(provider);
  });

  test("LLMService sets first provider as default", () => {
    const service = new LLMService();
    const provider = createProvider("openai", { apiKey: "test-key" });

    service.registerProvider("my-provider", provider);

    // Should be able to get it without specifying name
    const retrieved = service.getProvider();
    expect(retrieved).toBe(provider);
  });

  test("LLMService allows setting default provider", () => {
    const service = new LLMService();
    const provider1 = createProvider("openai", { apiKey: "test-key" });
    const provider2 = createProvider("anthropic", { apiKey: "test-key" });

    service.registerProvider("openai", provider1);
    service.registerProvider("anthropic", provider2);
    service.setDefaultProvider("anthropic");

    const retrieved = service.getProvider();
    expect(retrieved).toBe(provider2);
  });

  test("LLMService throws for non-existent provider", () => {
    const service = new LLMService();

    expect(() => {
      service.getProvider("non-existent");
    }).toThrow('Provider "non-existent" not found');
  });

  test("LLMService throws when setting non-existent default", () => {
    const service = new LLMService();

    expect(() => {
      service.setDefaultProvider("non-existent");
    }).toThrow('Provider "non-existent" not registered');
  });
});
