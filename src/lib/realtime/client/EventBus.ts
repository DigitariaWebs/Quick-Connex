"use client";

import { subscribeAppEvents } from "@/lib/realtime/ably-client";
import { EventEnvelope } from "../events";

export type EventHandler = (e: EventEnvelope) => void;

export class EventBus {
  private unsubscribe: null | (() => void) = null;
  private handlers: EventHandler[] = [];

  async start() {
    if (this.unsubscribe) return;
    this.unsubscribe = await subscribeAppEvents((e) => this.dispatch(e));
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  register(handler: EventHandler) {
    this.handlers.push(handler);
  }

  private dispatch(e: EventEnvelope) {
    // naive dedupe placeholder can be added here if needed
    for (const h of this.handlers) h(e);
  }
}


