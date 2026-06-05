import { test, expect, Page } from "@playwright/test";

// Helper: submit a document on the home page and land on its run detail page.
async function startRun(
  page: Page,
  opts: { doc?: string; forceFail?: boolean; simulateTimeout?: boolean } = {}
) {
  const doc = opts.doc ?? "https://example.com/whitepaper.pdf";
  await page.goto("/");
  await page.getByTestId("doc-input").fill(doc);
  if (opts.forceFail) await page.getByTestId("force-fail").check();
  if (opts.simulateTimeout) await page.getByTestId("simulate-timeout").check();
  await page.getByTestId("submit-run").click();
  // We are redirected to /runs/<id>
  await expect(page).toHaveURL(/\/runs\/.+/);
  return page.url();
}

test.describe("Workflow Orchestration — Document Ingestion Pipeline", () => {
  // AC1: submitting a document creates a run that visibly advances through all
  // four steps to succeeded.
  test("AC1: a submitted document advances through fetch→extract→embed→persist to succeeded", async ({
    page,
  }) => {
    await startRun(page);

    for (const name of ["fetch", "extract", "embed", "persist"]) {
      await expect(page.getByTestId(`step-${name}`)).toBeVisible();
    }

    // Every step ends succeeded, and the overall run succeeds.
    for (const name of ["fetch", "extract", "embed", "persist"]) {
      await expect(page.getByTestId(`step-status-${name}`)).toHaveText(
        /succeeded/i,
        { timeout: 30_000 }
      );
    }
    await expect(page.getByTestId("run-status")).toHaveText(/succeeded/i, {
      timeout: 30_000,
    });
  });

  // AC2: the flaky embed step shows a retry (attempt 2/3) before succeeding;
  // attempt count and backoff are visible.
  test("AC2: flaky embed step retries (attempt 2/3) with visible backoff before succeeding", async ({
    page,
  }) => {
    await startRun(page);

    const embed = page.getByTestId("step-embed");

    // Eventually embed succeeds, but only after a second attempt.
    await expect(page.getByTestId("step-status-embed")).toHaveText(
      /succeeded/i,
      { timeout: 30_000 }
    );

    // Attempt counter shows it took 2 of 3 attempts.
    await expect(page.getByTestId("attempt-count-embed")).toHaveText(/2\s*\/\s*3/);

    // Both the failed first attempt and the succeeded retry are listed.
    await expect(embed.getByTestId("attempt-row-1")).toContainText(/failed/i);
    await expect(embed.getByTestId("attempt-row-2")).toContainText(/succeeded/i);

    // The transient error from attempt 1 is surfaced (no silent masking).
    await expect(embed.getByTestId("attempt-row-1")).toContainText(/503|warming/i);

    // Backoff between attempts is shown.
    await expect(embed).toContainText(/backoff/i);
  });

  // AC3: forcing failure drives a step to failed with the real error message
  // surfaced — no silent fallback or fake default.
  test("AC3: forcing embed failure drives the step and run to failed with the real error surfaced", async ({
    page,
  }) => {
    await startRun(page, { forceFail: true });

    await expect(page.getByTestId("step-status-embed")).toHaveText(/failed/i, {
      timeout: 30_000,
    });
    await expect(page.getByTestId("run-status")).toHaveText(/failed/i, {
      timeout: 30_000,
    });

    // It exhausted all three attempts.
    await expect(page.getByTestId("attempt-count-embed")).toHaveText(/3\s*\/\s*3/);

    // The real provider error is shown, not a fake default/fallback value.
    await expect(page.getByTestId("step-error-embed")).toContainText(/503|provider/i);

    // No silent fallback: persist never ran / never succeeded.
    await expect(page.getByTestId("step-status-persist")).not.toHaveText(
      /succeeded/i
    );
  });

  // AC4: step timeout is enforced — a stalled step transitions to failed/retry
  // per its policy, not stuck forever.
  test("AC4: a stalled step hits its timeout and fails per policy instead of hanging", async ({
    page,
  }) => {
    await startRun(page, { simulateTimeout: true });

    // The stalled extract step does not stay running forever — it fails.
    await expect(page.getByTestId("step-status-extract")).toHaveText(/failed/i, {
      timeout: 40_000,
    });

    // The surfaced error names the timeout (not a generic crash).
    await expect(page.getByTestId("step-error-extract")).toContainText(
      /timeout|timed out/i
    );

    // The run terminates failed rather than hanging.
    await expect(page.getByTestId("run-status")).toHaveText(/failed/i, {
      timeout: 40_000,
    });
  });

  // AC5: run state survives a page refresh (persisted), confirming end-to-end
  // UI → API → workflow → datastore.
  test("AC5: run state is persisted and survives a page refresh", async ({
    page,
  }) => {
    const url = await startRun(page);

    await expect(page.getByTestId("run-status")).toHaveText(/succeeded/i, {
      timeout: 30_000,
    });

    await page.reload();

    // After reload the same terminal state is still there.
    await expect(page.getByTestId("run-status")).toHaveText(/succeeded/i);
    await expect(page.getByTestId("step-status-persist")).toHaveText(
      /succeeded/i
    );
    expect(page.url()).toBe(url);
  });
});
