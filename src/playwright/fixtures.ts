import { test as base, Page, Locator, expect } from "@playwright/test";
import path from "path";
import {
  VibeConfig,
  VibeCheckOptions,
  createDefaultConfig,
  mergeConfig,
} from "../config/config";
import { LLMService, createProvider } from "../providers";
import { LLMResponse } from "../types/llm";
import { ensureDir, generateScreenshotName } from "../utils/fs-utils";

/**
 * Result of a vibe check
 */
export interface VibeCheckResult extends LLMResponse {
  /** Path to the screenshot that was evaluated */
  screenshotPath: string;
}

/**
 * Extended test fixtures for vibe checking
 */
export interface VibeFixtures {
  /**
   * Vibe check a page or locator against a specification
   * @param target The page or locator to check
   * @param specification The natural language specification
   * @param options Optional configuration for this check
   * @returns The vibe check result
   */
  vibeCheck: (
    target: Page | Locator,
    specification: string,
    options?: VibeCheckOptions
  ) => Promise<VibeCheckResult>;

  /**
   * Configure global vibe check settings for this test
   * @param options Configuration options
   */
  configureVibes: (options: Partial<VibeConfig>) => void;

  /**
   * The current vibe configuration
   */
  vibeConfig: VibeConfig;
}

/**
 * Worker-scoped fixtures for shared resources
 */
export interface VibeWorkerFixtures {
  /** The LLM service instance shared across tests */
  llmService: LLMService;
}

/**
 * Create Playwright test with vibe check fixtures
 * @param userConfig Optional user configuration
 */
export function createVibeTest(userConfig?: Partial<VibeConfig>) {
  const initialConfig = mergeConfig(userConfig || {});

  return base.extend<VibeFixtures, VibeWorkerFixtures>({
    // Worker-scoped LLM service (shared across tests in a worker)
    llmService: [
      async ({}, use) => {
        const service = new LLMService();

        // Initialize providers from config
        const config = mergeConfig(userConfig || {});
        for (const [name, providerConfig] of Object.entries(config.providers)) {
          const provider = createProvider(
            providerConfig.type,
            providerConfig.config
          );
          service.registerProvider(
            name,
            provider,
            name === config.defaultProvider
          );
        }

        await use(service);
      },
      { scope: "worker" },
    ],

    // Test-scoped vibe config
    vibeConfig: [
      async ({}, use) => {
        // Start with a fresh copy of the initial config for each test
        const testConfig = mergeConfig(userConfig || {});
        await use(testConfig);
      },
      { scope: "test" },
    ],

    // Configure vibes for the current test
    configureVibes: [
      async ({ vibeConfig }, use) => {
        const configure = (options: Partial<VibeConfig>) => {
          if (options.defaultProvider) {
            vibeConfig.defaultProvider = options.defaultProvider;
          }
          if (options.evaluation) {
            vibeConfig.evaluation = {
              ...vibeConfig.evaluation,
              ...options.evaluation,
            };
          }
          if (options.providers) {
            vibeConfig.providers = {
              ...vibeConfig.providers,
              ...options.providers,
            };
          }
        };
        await use(configure);
      },
      { scope: "test" },
    ],

    // The main vibeCheck fixture
    vibeCheck: [
      async ({ llmService, vibeConfig }, use, testInfo) => {
        const vibeCheck = async (
          target: Page | Locator,
          specification: string,
          options?: VibeCheckOptions
        ): Promise<VibeCheckResult> => {
          // Generate screenshot name
          const screenshotName = generateScreenshotName(
            testInfo.title,
            options?.name
          );

          // Determine screenshot directory
          const screenshotDir = path.join(
            testInfo.project.outputDir || "test-results",
            "vibe-screenshots"
          );
          await ensureDir(screenshotDir);

          const screenshotPath = path.join(
            screenshotDir,
            `${screenshotName}.png`
          );

          // Take screenshot
          await target.screenshot({ path: screenshotPath });

          // Determine provider to use
          const providerName = options?.provider || vibeConfig.defaultProvider;

          // Merge evaluation options
          const evaluationOptions = {
            confidenceThreshold:
              options?.confidenceThreshold ??
              vibeConfig.evaluation.confidenceThreshold,
            includeRawResponse:
              options?.includeRawResponse ??
              vibeConfig.evaluation.includeRawResponse,
            maxRetries:
              options?.maxRetries ?? vibeConfig.evaluation.maxRetries,
            modelParameters: {
              ...vibeConfig.evaluation.modelParameters,
              ...options?.modelParameters,
            },
          };

          // Call LLM service
          const result = await llmService.evaluateScreenshot(
            screenshotPath,
            specification,
            providerName,
            evaluationOptions
          );

          // Build result with screenshot path
          const vibeResult: VibeCheckResult = {
            ...result,
            screenshotPath,
          };

          // Assert based on confidence threshold
          const threshold = evaluationOptions.confidenceThreshold ?? 0.8;

          if (
            result.verdict === "no" ||
            result.confidence < threshold
          ) {
            const failMessage = buildFailureMessage(
              specification,
              result,
              threshold,
              screenshotPath
            );
            throw new Error(failMessage);
          }

          return vibeResult;
        };

        await use(vibeCheck);
      },
      { scope: "test" },
    ],
  });
}

/**
 * Build a descriptive failure message
 */
function buildFailureMessage(
  specification: string,
  result: LLMResponse,
  threshold: number,
  screenshotPath: string
): string {
  const lines = [
    "Vibe check failed!",
    "",
    `Specification: "${specification}"`,
    "",
    `Verdict: ${result.verdict}`,
    `Confidence: ${(result.confidence * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`,
  ];

  if (result.reasoning) {
    lines.push("", `Reasoning: ${result.reasoning}`);
  }

  if (result.failReason) {
    lines.push("", `Fail Reason: ${result.failReason}`);
  }

  if (result.suggestions && result.suggestions.length > 0) {
    lines.push("", "Suggestions:");
    result.suggestions.forEach((s) => lines.push(`  - ${s}`));
  }

  lines.push("", `Screenshot: ${screenshotPath}`);

  return lines.join("\n");
}

/**
 * Default test instance with vibe check fixtures
 */
export const test = createVibeTest();

/**
 * Re-export expect for convenience
 */
export { expect };
