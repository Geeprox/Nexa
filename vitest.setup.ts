import "@testing-library/jest-dom/vitest";
import { webcrypto } from "crypto";

if (!globalThis.crypto) {
  // @ts-expect-error - Node crypto polyfill for tests.
  globalThis.crypto = webcrypto;
}

if (!globalThis.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}

    unobserve() {}

    disconnect() {}
  }
  // @ts-expect-error - Test environment polyfill.
  globalThis.ResizeObserver = ResizeObserverMock;
}
