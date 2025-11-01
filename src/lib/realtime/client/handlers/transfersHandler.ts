"use client";

import { EventEnvelope } from "../../events";

export function createTransfersHandler(onTransferCreated: (envelope: EventEnvelope) => void) {
  return (e: EventEnvelope) => {
    if (e.type === 'transfer.created') {
      onTransferCreated(e);
    }
  };
}


