import fs from "fs";
import path from "path";

/**
 * Check if a path exists
 * @param filePath Path to check
 * @returns True if path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath Directory path to ensure exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory already exists is fine
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

/**
 * Read a file as base64
 * @param filePath Path to the file
 * @returns Base64 encoded file content
 */
export async function readFileAsBase64(filePath: string): Promise<string> {
  const imageBuffer = await fs.promises.readFile(filePath);
  return imageBuffer.toString("base64");
}

/**
 * Generate a unique screenshot name
 * @param testTitle Test title
 * @param customName Optional custom name
 * @returns Generated screenshot name
 */
export function generateScreenshotName(
  testTitle: string,
  customName?: string
): string {
  const timestamp = Date.now();
  const sanitizedTitle = testTitle
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);

  if (customName) {
    const sanitizedCustom = customName
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-");
    return `${sanitizedTitle}-${sanitizedCustom}-${timestamp}`;
  }

  return `${sanitizedTitle}-${timestamp}`;
}
