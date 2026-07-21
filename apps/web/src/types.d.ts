/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

import type { CareerState } from "@football/protocol";

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    __footballState?: CareerState;
  }
}

export {};
