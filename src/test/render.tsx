import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

import { ToastProvider } from "@/design-system/primitives";
import { clearMockRules, setMockLatency } from "@/services/mock/control";
import { resetDb } from "@/services/mock/db";
import { createMockServices } from "@/services/mock";
import { ServicesProvider } from "@/services/services-context";

export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  forward: vi.fn(),
};

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParams,
  usePathname: () => "/",
}));

export function setSearchParams(value: string) {
  searchParams = new URLSearchParams(value);
}

export function renderWithServices(
  ui: ReactElement,
  options: { before?: () => void } = {},
) {
  resetDb();
  clearMockRules();
  setMockLatency(0);
  options.before?.();
  Object.values(routerMock).forEach((fn) => fn.mockReset());
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={createMockServices()}>
        <ToastProvider>{ui}</ToastProvider>
      </ServicesProvider>
    </QueryClientProvider>,
  );
}
