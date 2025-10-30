"use client";

import * as Ably from "ably";
import { EventEnvelope, isEventEnvelope } from "./events";
import { APP_EVENTS_CHANNEL } from "./core/constants";

let realtimeClient: Ably.Types.RealtimePromise | null = null;

export function getRealtimeClient(): Ably.Types.RealtimePromise {
  if (realtimeClient) return realtimeClient;
  const client = new Ably.Realtime.Promise({
    authUrl: "/api/realtime/token",
    recover: (lastConnectionDetails, cb) => cb(true),
    echoMessages: false,
  });
  realtimeClient = client;
  return client;
}

export async function subscribeAppEvents(
  handler: (envelope: EventEnvelope) => void
): Promise<() => void> {
  const client = getRealtimeClient();
  await client.connection.once("connected");
  const channel = client.channels.get(APP_EVENTS_CHANNEL);
  await channel.attach();
  const listener = (msg: Ably.Types.Message) => {
    const data = msg.data as unknown;
    if (isEventEnvelope(data)) {
      handler(data);
    }
  };
  channel.subscribe(listener);
  return () => {
    try {
      channel.unsubscribe(listener);
    } catch {}
  };
}


