import { test, expect } from "@playwright/test";

// The AI Insights panel is BYOK-gated. These tests stub the LLM via the "mock"
// provider sentinel so they never require a real API key.

test.describe("BYOK — AI Insights gate", () => {
  // Gate closed: no key configured → AI feature disabled with the inline hint.
  test("with no API key, AI insights are disabled and the settings hint is shown", async ({
    page,
  }) => {
    // Start a run so we have a detail page (which hosts the AI panel).
    await page.goto("/");
    await page.getByTestId("doc-input").fill("https://example.com/report.pdf");
    await page.getByTestId("submit-run").click();
    await expect(page).toHaveURL(/\/runs\/.+/);

    await expect(page.getByTestId("ai-hint")).toContainText(
      /Settings to enable live AI/i
    );
    await expect(page.getByTestId("ai-generate")).toBeDisabled();
  });

  // Gate open: mock provider configured → AI feature works, returns deterministic
  // mock output, no real network call.
  test("with a key configured, AI insights produce output (mock provider)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "byok",
        JSON.stringify({ provider: "mock", apiKey: "test", model: "mock" })
      );
    });

    await page.goto("/");
    await page.getByTestId("doc-input").fill("https://example.com/report.pdf");
    await page.getByTestId("submit-run").click();
    await expect(page).toHaveURL(/\/runs\/.+/);

    const btn = page.getByTestId("ai-generate");
    await expect(btn).toBeEnabled();
    await btn.click();

    await expect(page.getByTestId("ai-output")).toContainText(
      /MOCK INSIGHT/i,
      { timeout: 15_000 }
    );
  });
});

test.describe("BYOK — Settings", () => {
  test("settings page saves provider/key/model to localStorage and updates model options", async ({
    page,
  }) => {
    await page.goto("/settings");

    // Default provider is Anthropic with its default model selectable.
    await page.getByTestId("provider-select").selectOption("openai");
    // Model options update to OpenAI defaults.
    await expect(
      page.getByTestId("model-select").locator("option")
    ).toContainText(["gpt-4o-mini"]);

    await page.getByTestId("apikey-input").fill("sk-test-123");
    await page.getByTestId("model-select").selectOption("gpt-4o");
    await page.getByTestId("save-byok").click();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("byok")
    );
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(parsed).toMatchObject({
      provider: "openai",
      apiKey: "sk-test-123",
      model: "gpt-4o",
    });

    // Clear wipes it.
    await page.getByTestId("clear-byok").click();
    const cleared = await page.evaluate(() =>
      window.localStorage.getItem("byok")
    );
    expect(cleared).toBeNull();
  });
});
