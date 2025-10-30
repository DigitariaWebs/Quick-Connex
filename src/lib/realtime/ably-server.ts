import Ably from "ably";
import { log } from "@/lib/logging";
import { EventEnvelope, EventEnvelopeSchema } from "./events";
import { APP_EVENTS_CHANNEL } from "./core/constants";

let restClient: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest {
  if (restClient) return restClient;
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    throw new Error("ABLY_API_KEY is not set");
  }
  restClient = new Ably.Rest({ key: apiKey });
  return restClient;
}

export async function publishEvent(envelope: EventEnvelope): Promise<void> {
  const client = getAblyRest();
  const parsed = EventEnvelopeSchema.safeParse(envelope);
  if (!parsed.success) {
    throw new Error("Invalid event envelope");
  }
  const channel = client.channels.get(APP_EVENTS_CHANNEL);
  try {
    await channel.publish({ name: envelope.type, data: { ...envelope } });
  } catch (error) {
    log.error("Failed to publish Ably event", error, { type: envelope.type, entityId: envelope.entityId });
    throw error;
  }
}

export interface PushPayload {
  title: string;
  body?: string;
  data?: Record<string, string>;
}

export async function publishPush(
  target: { clientId?: string; deviceId?: string },
  notification: PushPayload
): Promise<void> {
  const client = getAblyRest();
  try {
    if (target.clientId) {
      await client.push.admin.publish({ clientId: target.clientId }, {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
      });
      return;
    }
    if (target.deviceId) {
      await client.push.admin.publish({ deviceId: target.deviceId }, {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
      });
      return;
    }
    throw new Error("publishPush requires clientId or deviceId");
  } catch (error) {
    log.error("Failed to publish Ably push", error, { target });
    throw error;
  }
}

export async function createTokenRequestForUser(clientId: string) {
  const client = getAblyRest();
  return client.auth.createTokenRequest({ clientId });
}


