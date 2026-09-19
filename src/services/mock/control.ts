import { ServiceError } from "../errors";

export type FailureMode = "fail" | "hang" | "once";

export interface MockControlState {
  latencyMs: number;
  rules: Record<string, FailureMode>;
}

const DEFAULT_LATENCY_MS = 280;

const state: MockControlState = {
  latencyMs: DEFAULT_LATENCY_MS,
  rules: {},
};

const listeners = new Set<() => void>();

export function getMockControl(): Readonly<MockControlState> {
  return state;
}

export function subscribeMockControl(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function setMockLatency(latencyMs: number) {
  state.latencyMs = Math.max(0, latencyMs);
  emit();
}

export function setMockRule(operation: string, mode: FailureMode | null) {
  if (mode) state.rules[operation] = mode;
  else delete state.rules[operation];
  emit();
}

export function clearMockRules() {
  state.rules = {};
  emit();
}

export function parseMockParam(
  value: string | null,
): Partial<MockControlState> {
  if (!value) return {};
  const rules: Record<string, FailureMode> = {};
  let latencyMs: number | undefined;
  for (const part of value.split(",")) {
    const [key, mode] = part.split(":");
    if (!key || !mode) continue;
    if (key === "latency") {
      const parsed = Number(mode);
      if (Number.isFinite(parsed)) latencyMs = parsed;
    } else if (mode === "fail" || mode === "hang" || mode === "once") {
      rules[key] = mode;
    }
  }
  return { rules, ...(latencyMs !== undefined ? { latencyMs } : {}) };
}

export function applyMockParam(value: string | null) {
  const parsed = parseMockParam(value);
  if (parsed.rules) state.rules = { ...state.rules, ...parsed.rules };
  if (parsed.latencyMs !== undefined) state.latencyMs = parsed.latencyMs;
  emit();
}

function matchRule(operation: string): FailureMode | undefined {
  if (state.rules[operation]) return state.rules[operation];
  const namespace = operation.split(".")[0];
  return state.rules[`${namespace}.*`] ?? state.rules["*"];
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function simulate<T>(
  operation: string,
  run: () => T | Promise<T>,
  options: { latencyMs?: number } = {},
): Promise<T> {
  const latency = options.latencyMs ?? state.latencyMs;
  if (latency > 0) await sleep(latency * (0.7 + Math.random() * 0.6));
  const mode = matchRule(operation);
  if (mode === "hang") {
    await new Promise<never>(() => {});
  }
  if (mode === "fail" || mode === "once") {
    if (mode === "once") delete state.rules[operation];
    throw new ServiceError(
      "network",
      "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
      operation,
    );
  }
  const result = await run();
  return structuredClone(result);
}
