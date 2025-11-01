import { z } from "zod";

export const EventType = z.enum([
  "transfer.created",
  "transfer.updated",
  "transfer.status_changed",
  "notification.created",
  "system.announcement",
]);

export type EventType = z.infer<typeof EventType>;

export const EventEnvelopeSchema = z.object({
  id: z.string().min(10),
  type: EventType,
  entity: z.string(),
  entityId: z.string(),
  actorId: z.string().optional(),
  recipients: z.array(z.string()).optional(),
  ts: z.number(),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export function isEventEnvelope(value: unknown): value is EventEnvelope {
  const parsed = EventEnvelopeSchema.safeParse(value);
  return parsed.success;
}

export function createEnvelope(params: Omit<EventEnvelope, "ts">): EventEnvelope {
  return { ...params, ts: Date.now() };
}


