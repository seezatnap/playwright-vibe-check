# playwright-vibe-check

LLM-based visual testing for Playwright, using OpenAI and Claude to evaluate UI against natural language specifications.

Instead of brittle pixel-perfect screenshot comparisons, describe what your UI should look like in plain English and let AI evaluate whether it matches.

## Installation

```bash
npm install playwright-vibe-check
```

## Quick Start

1. Set up your API keys in a `.env` file or environment variables:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

2. Import the test fixtures in your test file:

```typescript
import { test, expect } from 'playwright-vibe-check';

test('should display a proper login form', async ({ page, vibeCheck }) => {
  await page.goto('https://example.com/login');

  await vibeCheck(
    page,
    'A login form with email and password input fields, and a blue submit button'
  );
});
```

## API

### `vibeCheck(target, specification, options?)`

Evaluates whether a page or element matches a natural language specification.

**Parameters:**
- `target`: `Page | Locator` - The page or element to check
- `specification`: `string` - Natural language description of expected UI
- `options?`: `VibeCheckOptions` - Optional configuration

**Options:**
```typescript
interface VibeCheckOptions {
  name?: string;              // Custom screenshot name
  provider?: 'openai' | 'anthropic';  // LLM provider to use
  confidenceThreshold?: number;  // 0-1, default 0.8
  includeRawResponse?: boolean;  // Include raw LLM response
  maxRetries?: number;           // Retry count on failure
  modelParameters?: Record<string, unknown>;  // Provider-specific params
}
```

**Returns:** `Promise<VibeCheckResult>`
```typescript
interface VibeCheckResult {
  verdict: 'yes' | 'no';
  confidence: number;
  reasoning?: string;
  failReason?: string;
  suggestions?: string[];
  screenshotPath: string;
}
```

### `configureVibes(options)`

Configure global settings for all vibe checks in the current test.

```typescript
test('my test', async ({ page, vibeCheck, configureVibes }) => {
  configureVibes({
    defaultProvider: 'anthropic',
    evaluation: {
      confidenceThreshold: 0.9,
      maxRetries: 3,
    },
  });

  await page.goto('https://example.com');
  await vibeCheck(page, 'A beautiful homepage');
});
```

## Usage Examples

### Basic Page Check

```typescript
import { test, expect } from 'playwright-vibe-check';

test('homepage has correct layout', async ({ page, vibeCheck }) => {
  await page.goto('https://example.com');

  await vibeCheck(
    page,
    'A professional homepage with a navigation bar at the top, hero section with a call-to-action button, and footer at the bottom'
  );
});
```

### Element-Specific Check

```typescript
test('button has correct styling', async ({ page, vibeCheck }) => {
  await page.goto('https://example.com');

  const submitButton = page.locator('button[type="submit"]');

  await vibeCheck(
    submitButton,
    'A blue button with white text saying "Submit", with rounded corners'
  );
});
```

### Custom Provider Per Check

```typescript
test('verify with Anthropic', async ({ page, vibeCheck }) => {
  await page.goto('https://example.com');

  await vibeCheck(
    page,
    'A clean, minimal design',
    { provider: 'anthropic' }
  );
});
```

### Chaining Multiple Checks

```typescript
test('verify multiple elements', async ({ page, vibeCheck }) => {
  await page.goto('https://example.com');

  // Check the overall page
  await vibeCheck(page, 'A well-structured webpage');

  // Check specific elements
  await vibeCheck(
    page.locator('header'),
    'A navigation bar with logo on the left and menu items on the right'
  );

  await vibeCheck(
    page.locator('footer'),
    'A footer with copyright notice and social media links'
  );
});
```

### Custom Confidence Threshold

```typescript
test('relaxed visual check', async ({ page, vibeCheck }) => {
  await page.goto('https://example.com');

  // Lower threshold for more lenient matching
  await vibeCheck(
    page,
    'A webpage with some content',
    { confidenceThreshold: 0.6 }
  );
});
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o vision |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude vision |
| `VIBE_DEFAULT_PROVIDER` | Default provider (`openai` or `anthropic`) |

### Custom Test Instance

For advanced configuration, create a custom test instance:

```typescript
import { createVibeTest } from 'playwright-vibe-check';

export const test = createVibeTest({
  defaultProvider: 'anthropic',
  evaluation: {
    confidenceThreshold: 0.85,
    includeRawResponse: true,
    maxRetries: 3,
    modelParameters: {
      temperature: 0.1,
    },
  },
});

export { expect } from 'playwright-vibe-check';
```

Then import from your custom file:

```typescript
import { test, expect } from './my-test-setup';
```

## How It Works

1. **Screenshot Capture**: When `vibeCheck()` is called, a screenshot of the target (page or element) is captured.

2. **LLM Evaluation**: The screenshot and your specification are sent to the configured LLM (OpenAI GPT-4o or Anthropic Claude).

3. **Confidence Scoring**: The LLM analyzes the image and returns:
   - `verdict`: Whether the UI matches (`yes` or `no`)
   - `confidence`: A score from 0.0 to 1.0
   - `reasoning`: Explanation of the decision
   - `suggestions`: Ideas for improvement (if applicable)

4. **Assertion**: If the confidence is below the threshold or verdict is "no", the test fails with a detailed error message.

## Provider Comparison

| Feature | OpenAI (GPT-4o) | Anthropic (Claude) |
|---------|-----------------|-------------------|
| Default Model | `gpt-4o` | `claude-3-7-sonnet-latest` |
| Image Analysis | Excellent | Excellent |
| Speed | Fast | Fast |
| Cost | See OpenAI pricing | See Anthropic pricing |

## Best Practices

1. **Be Specific**: Write clear, specific specifications that describe exactly what you expect to see.

2. **Focus on Key Elements**: Don't try to describe every pixel. Focus on the important visual aspects.

3. **Use Appropriate Thresholds**: Lower thresholds for rough checks, higher for critical UI elements.

4. **Combine with Traditional Tests**: Use vibe checks alongside traditional assertions for comprehensive testing.

## License

MIT
