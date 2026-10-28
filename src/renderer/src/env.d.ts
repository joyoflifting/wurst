/// <reference types="vite/client" />

import type { WurstBridge } from "../../shared/bridge";

declare global {
  interface Window {
    wurst?: WurstBridge;
  }
}

export {};
