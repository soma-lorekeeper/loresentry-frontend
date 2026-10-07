import { fileURLToPath } from "node:url";

import { configDefaults, defineConfig } from "vitest/config";

const EN_TESTS = "src/**/*.en.test.{ts,tsx}";

// 문구는 빌드 때 언어 하나로 굳는다. 그래서 테스트도 언어마다 따로 돈다. 대부분은 한국어판에서,
// `*.en.test.*` 만 영어판에서 돈다.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    setupFiles: ["./src/test/setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "ko",
          exclude: [...configDefaults.exclude, EN_TESTS],
          env: { NEXT_PUBLIC_LOCALE: "ko" },
        },
      },
      {
        extends: true,
        test: {
          name: "en",
          include: [EN_TESTS],
          env: { NEXT_PUBLIC_LOCALE: "en" },
        },
      },
    ],
  },
});
