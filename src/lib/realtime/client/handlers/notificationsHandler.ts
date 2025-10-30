"use client";

import { EventEnvelope } from "../../events";

export function createNotificationsHandler(onEnvelope: (e: EventEnvelope) => void) {
  return (e: EventEnvelope) => {
    if (e.type === 'notification.created') onEnvelope(e);
  };
}


