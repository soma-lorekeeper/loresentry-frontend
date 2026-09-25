import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./integration/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:3199", headless: true },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
  ],
  webServer: {
    command: "node integration/browser/server.mjs",
    url: "http://127.0.0.1:3199",
    reuseExistingServer: false,
  },
});
