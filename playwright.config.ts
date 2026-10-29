import { defineConfig, devices } from "@playwright/test";

/**
 * Brand smoke tests: public screens plus /styleguide, at phone size.
 * The app runs against a Supabase URL that refuses connections, so pages
 * render their signed-out, no-data state the same way every time.
 *
 *   npm run test:brand            run the checks
 *   npm run test:brand:update     accept new screenshots after a deliberate design change
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices["iPhone 13"],
    browserName: "chromium",
    colorScheme: "dark",
    reducedMotion: "reduce",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/styleguide`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
