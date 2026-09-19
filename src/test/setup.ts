import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  if (!window[name]) {
    Object.defineProperty(window, name, {
      configurable: true,
      value: new MemoryStorage(),
    });
  }
}

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});
