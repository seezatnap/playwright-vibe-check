import { test, expect } from "@playwright/test";
import { generateScreenshotName } from "../../src/utils/fs-utils";

test.describe("File System Utilities", () => {
  test("generateScreenshotName creates valid filename from test title", () => {
    const name = generateScreenshotName("should verify button appearance");

    expect(name).toMatch(/^should-verify-button-appearance-\d+$/);
    // Should not contain spaces or special characters except hyphen
    expect(name).not.toMatch(/\s/);
  });

  test("generateScreenshotName includes custom name when provided", () => {
    const name = generateScreenshotName("my test", "custom-screenshot");

    expect(name).toMatch(/^my-test-custom-screenshot-\d+$/);
  });

  test("generateScreenshotName sanitizes special characters", () => {
    const name = generateScreenshotName("test with: special/characters!@#$%");

    // Should only contain alphanumeric and hyphens
    expect(name).toMatch(/^[a-zA-Z0-9-]+$/);
  });

  test("generateScreenshotName truncates long titles", () => {
    const longTitle = "a".repeat(100);
    const name = generateScreenshotName(longTitle);

    // Should be truncated to 50 chars max for the title portion
    expect(name.split("-")[0].length).toBeLessThanOrEqual(50);
  });
});
