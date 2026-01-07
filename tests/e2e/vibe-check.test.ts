/**
 * Example tests demonstrating how to use playwright-vibe-check
 *
 * These tests require valid API keys to run:
 * - OPENAI_API_KEY for OpenAI provider
 * - ANTHROPIC_API_KEY for Anthropic provider
 *
 * Set these in your environment or .env file to run these tests.
 *
 * To run: npx playwright test tests/e2e/vibe-check.example.ts
 */
import { test, expect } from "../../src";

// Configure vibes for all tests in this file
test.beforeEach(async ({ configureVibes }) => {
  configureVibes({
    evaluation: {
      confidenceThreshold: 0.8,
      includeRawResponse: false,
      maxRetries: 2,
      modelParameters: {},
    },
  });
});

test.describe("Vibe Check Examples", () => {
  test("should verify a simple page layout", async ({ page, vibeCheck }) => {
    // Navigate to a page
    await page.goto("https://example.com");

    // Vibe check the entire page
    const result = await vibeCheck(
      page,
      "A simple webpage with a heading that says 'Example Domain' and a paragraph of text"
    );

    expect(result.verdict).toBe("yes");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test("should verify a specific element", async ({ page, vibeCheck }) => {
    await page.goto("https://example.com");

    // Get a specific locator and vibe check just that element
    const heading = page.locator("h1");

    const result = await vibeCheck(
      heading,
      "A heading element containing the text 'Example Domain'"
    );

    expect(result.verdict).toBe("yes");
  });

  test("should use custom options per check", async ({ page, vibeCheck }) => {
    await page.goto("https://example.com");

    const result = await vibeCheck(
      page,
      "A webpage with a clean, minimal design",
      {
        name: "minimal-design-check",
        confidenceThreshold: 0.7,
        provider: "openai",
      }
    );

    expect(result.verdict).toBe("yes");
    expect(result.screenshotPath).toContain("minimal-design-check");
  });

  test("should chain multiple vibe checks", async ({ page, vibeCheck }) => {
    await page.goto("https://example.com");

    // Check the overall page
    await vibeCheck(
      page,
      "A simple, clean webpage"
    );

    // Check specific elements
    await vibeCheck(
      page.locator("h1"),
      "A heading with the text 'Example Domain'"
    );

    await vibeCheck(
      page.locator("p").first(),
      "A paragraph containing informative text"
    );
  });
});

test.describe("Provider Switching", () => {
  test("should use Anthropic provider when configured", async ({
    page,
    vibeCheck,
    configureVibes
  }) => {
    // Switch to Anthropic for this test
    configureVibes({
      defaultProvider: "anthropic",
    });

    await page.goto("https://example.com");

    const result = await vibeCheck(
      page,
      "A webpage with a heading and some text"
    );

    expect(result.verdict).toBe("yes");
  });

  test("should override provider per-check", async ({ page, vibeCheck }) => {
    await page.goto("https://example.com");

    // Use Anthropic just for this one check
    const result = await vibeCheck(
      page,
      "A simple example webpage",
      { provider: "anthropic" }
    );

    expect(result.verdict).toBe("yes");
  });
});
