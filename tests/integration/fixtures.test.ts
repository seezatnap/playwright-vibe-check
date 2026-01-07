import { test as base, expect } from "@playwright/test";
import { createVibeTest, VibeFixtures, VibeWorkerFixtures } from "../../src";
import { LLMService } from "../../src/providers";
import { LLMProvider, LLMResponse } from "../../src/types/llm";

/**
 * Mock LLM Provider for testing without API keys
 */
class MockLLMProvider implements LLMProvider {
  private mockResponse: LLMResponse;

  constructor(mockResponse?: Partial<LLMResponse>) {
    this.mockResponse = {
      verdict: "yes",
      confidence: 0.95,
      reasoning: "Mock response - all checks pass",
      ...mockResponse,
    };
  }

  async evaluateScreenshot(
    _screenshotPath: string,
    _specification: string
  ): Promise<LLMResponse> {
    return this.mockResponse;
  }

  setMockResponse(response: Partial<LLMResponse>): void {
    this.mockResponse = {
      ...this.mockResponse,
      ...response,
    };
  }
}

/**
 * Create a test instance with mock LLM provider
 */
const mockProvider = new MockLLMProvider();

const test = base.extend<VibeFixtures, VibeWorkerFixtures>({
  llmService: [
    async ({}, use) => {
      const service = new LLMService();
      service.registerProvider("mock", mockProvider, true);
      await use(service);
    },
    { scope: "worker" },
  ],
  vibeConfig: [
    async ({}, use) => {
      await use({
        defaultProvider: "mock",
        providers: {
          mock: {
            type: "openai", // type doesn't matter for mock
            config: {},
          },
        },
        evaluation: {
          confidenceThreshold: 0.8,
          includeRawResponse: false,
          maxRetries: 1,
          modelParameters: {},
        },
      });
    },
    { scope: "test" },
  ],
  configureVibes: [
    async ({ vibeConfig }, use) => {
      const configure = (options: Partial<typeof vibeConfig>) => {
        if (options.defaultProvider) {
          vibeConfig.defaultProvider = options.defaultProvider;
        }
        if (options.evaluation) {
          vibeConfig.evaluation = {
            ...vibeConfig.evaluation,
            ...options.evaluation,
          };
        }
      };
      await use(configure);
    },
    { scope: "test" },
  ],
  vibeCheck: [
    async ({ llmService, vibeConfig, page }, use, testInfo) => {
      const { generateScreenshotName, ensureDir } = await import(
        "../../src/utils/fs-utils"
      );
      const path = await import("path");

      const vibeCheck = async (
        target: any,
        specification: string,
        options?: any
      ) => {
        const screenshotName = generateScreenshotName(
          testInfo.title,
          options?.name
        );

        const screenshotDir = path.join(
          testInfo.project.outputDir || "test-results",
          "vibe-screenshots"
        );
        await ensureDir(screenshotDir);

        const screenshotPath = path.join(
          screenshotDir,
          `${screenshotName}.png`
        );

        await target.screenshot({ path: screenshotPath });

        const evaluationOptions = {
          confidenceThreshold:
            options?.confidenceThreshold ??
            vibeConfig.evaluation.confidenceThreshold,
          includeRawResponse:
            options?.includeRawResponse ??
            vibeConfig.evaluation.includeRawResponse,
          maxRetries:
            options?.maxRetries ?? vibeConfig.evaluation.maxRetries,
        };

        const result = await llmService.evaluateScreenshot(
          screenshotPath,
          specification,
          undefined,
          evaluationOptions
        );

        const threshold = evaluationOptions.confidenceThreshold ?? 0.8;

        if (result.verdict === "no" || result.confidence < threshold) {
          throw new Error(
            `Vibe check failed!\n` +
            `Specification: "${specification}"\n` +
            `Verdict: ${result.verdict}\n` +
            `Confidence: ${(result.confidence * 100).toFixed(1)}%\n` +
            `Reasoning: ${result.reasoning}`
          );
        }

        return {
          ...result,
          screenshotPath,
        };
      };

      await use(vibeCheck);
    },
    { scope: "test" },
  ],
});

test.describe("Vibe Check Fixtures (Mocked)", () => {
  test("vibeCheck passes when confidence exceeds threshold", async ({
    page,
    vibeCheck,
  }) => {
    // Reset mock to passing state
    mockProvider.setMockResponse({
      verdict: "yes",
      confidence: 0.95,
      reasoning: "The UI matches the specification",
    });

    await page.goto("https://example.com");

    const result = await vibeCheck(
      page,
      "A simple webpage"
    );

    expect(result.verdict).toBe("yes");
    expect(result.confidence).toBe(0.95);
    expect(result.screenshotPath).toBeTruthy();
  });

  test("vibeCheck fails when verdict is no", async ({ page, vibeCheck }) => {
    mockProvider.setMockResponse({
      verdict: "no",
      confidence: 0.9,
      reasoning: "The UI does not match",
      failReason: "Expected button not found",
    });

    await page.goto("https://example.com");

    await expect(
      vibeCheck(page, "A page with a submit button")
    ).rejects.toThrow("Vibe check failed");
  });

  test("vibeCheck fails when confidence is below threshold", async ({
    page,
    vibeCheck,
  }) => {
    mockProvider.setMockResponse({
      verdict: "yes",
      confidence: 0.5, // Below default 0.8 threshold
      reasoning: "Uncertain match",
    });

    await page.goto("https://example.com");

    await expect(
      vibeCheck(page, "A matching page")
    ).rejects.toThrow("Vibe check failed");
  });

  test("vibeCheck can check locators", async ({ page, vibeCheck }) => {
    mockProvider.setMockResponse({
      verdict: "yes",
      confidence: 0.95,
      reasoning: "Element matches specification",
    });

    await page.goto("https://example.com");
    const heading = page.locator("h1");

    const result = await vibeCheck(
      heading,
      "A heading element"
    );

    expect(result.verdict).toBe("yes");
  });

  test("vibeCheck respects custom confidence threshold", async ({
    page,
    vibeCheck,
  }) => {
    mockProvider.setMockResponse({
      verdict: "yes",
      confidence: 0.6,
      reasoning: "Moderate match",
    });

    await page.goto("https://example.com");

    // With default threshold (0.8), this would fail
    // But with custom threshold (0.5), it should pass
    const result = await vibeCheck(
      page,
      "A webpage",
      { confidenceThreshold: 0.5 }
    );

    expect(result.verdict).toBe("yes");
  });

  test("vibeCheck creates screenshot with custom name", async ({
    page,
    vibeCheck,
  }) => {
    mockProvider.setMockResponse({
      verdict: "yes",
      confidence: 0.95,
      reasoning: "Match",
    });

    await page.goto("https://example.com");

    const result = await vibeCheck(
      page,
      "A webpage",
      { name: "my-custom-screenshot" }
    );

    expect(result.screenshotPath).toContain("my-custom-screenshot");
  });
});

test.describe("configureVibes", () => {
  test("allows changing confidence threshold", async ({
    page,
    vibeCheck,
    configureVibes,
  }) => {
    mockProvider.setMockResponse({
      verdict: "yes",
      confidence: 0.7,
      reasoning: "Moderate match",
    });

    await page.goto("https://example.com");

    // First, should fail with default threshold
    await expect(vibeCheck(page, "A page")).rejects.toThrow();

    // Configure lower threshold
    configureVibes({
      evaluation: {
        confidenceThreshold: 0.6,
        includeRawResponse: false,
        maxRetries: 1,
        modelParameters: {},
      },
    });

    // Now should pass
    const result = await vibeCheck(page, "A page");
    expect(result.confidence).toBe(0.7);
  });
});
