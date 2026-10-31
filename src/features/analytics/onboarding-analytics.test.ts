import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/services/errors";
import {
  projectFailureReason,
  useOnboardingAnalytics,
  useRegistrationAnalytics,
} from "./onboarding-analytics";

const enabled = vi.hoisted(() => vi.fn(() => true));
const claim = vi.hoisted(() => vi.fn());
vi.mock("@/services/services-context", () => ({
  useServices: () => ({ auth: { claimRegistrationAnalytics: claim } }),
}));
vi.mock("@/app/providers", () => ({ useRuntimeConfig: () => ({}) }));
vi.mock("./google-analytics", () => ({
  analyticsEnabled: enabled,
  installGoogleAnalytics: () => window.gtag,
}));

afterEach(() => {
  delete window.gtag;
  enabled.mockReturnValue(true);
  claim.mockReset();
});

describe("onboarding analytics", () => {
  it("sends bounded action parameters and respects disabled analytics", () => {
    window.gtag = vi.fn();
    const { result, rerender } = renderHook(() => useOnboardingAnalytics());
    result.current("project_created", { project_type: "sample" });
    expect(window.gtag).toHaveBeenCalledWith("event", "project_created", {
      project_type: "sample",
    });
    enabled.mockReturnValue(false);
    rerender();
    result.current("tutorial_begin");
    expect(window.gtag).toHaveBeenCalledTimes(1);
  });

  it("does not interrupt user actions if the tag fails", () => {
    window.gtag = vi.fn(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useOnboardingAnalytics());
    expect(() =>
      result.current("login_start", { method: "google" }),
    ).not.toThrow();
  });

  it("sends signup only for a successful pending registration claim", async () => {
    window.gtag = vi.fn();
    claim.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const { result } = renderHook(() => useRegistrationAnalytics());
    result.current("consent");
    await waitFor(() =>
      expect(window.gtag).toHaveBeenCalledWith("event", "sign_up", {
        method: "google",
      }),
    );
    result.current("session");
    await waitFor(() => expect(claim).toHaveBeenCalledTimes(2));
    expect(window.gtag).toHaveBeenCalledTimes(1);
    enabled.mockReturnValue(false);
    result.current("session");
    expect(claim).toHaveBeenCalledTimes(2);
  });

  it("keeps journey events behind a pending signup without blocking actions", async () => {
    window.gtag = vi.fn();
    let resolve!: (value: boolean) => void;
    claim.mockReturnValue(
      new Promise<boolean>((done) => {
        resolve = done;
      }),
    );
    const registration = renderHook(() => useRegistrationAnalytics());
    const journey = renderHook(() => useOnboardingAnalytics());
    registration.result.current("consent");
    journey.result.current("tutorial_begin");
    expect(window.gtag).not.toHaveBeenCalled();
    resolve(true);
    await waitFor(() => expect(window.gtag).toHaveBeenCalledTimes(2));
    expect(vi.mocked(window.gtag).mock.calls.map((call) => call[1])).toEqual([
      "sign_up",
      "tutorial_begin",
    ]);
  });

  it("does not classify uncertain network failures as rejected creations", () => {
    expect(
      projectFailureReason(new ServiceError("network", "network")),
    ).toBeNull();
    expect(
      projectFailureReason(new ServiceError("unknown", "unknown")),
    ).toBeNull();
    expect(
      projectFailureReason(new ServiceError("validation", "invalid")),
    ).toBe("rejected");
    expect(
      projectFailureReason(new ServiceError("unavailable", "unavailable")),
    ).toBe("unavailable");
  });
});
