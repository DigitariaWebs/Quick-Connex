import { EventEnvelope } from "../events";

export type PushPolicyKey = 'default';

// Minimal policy: push for transfer.created
export function shouldSendPush(envelope: EventEnvelope, _policy: PushPolicyKey = 'default'): boolean {
  return envelope.type === 'transfer.created';
}

// Audience selection stub: use recipients field if provided
export function resolveRecipients(envelope: EventEnvelope): string[] {
  return envelope.recipients || [];
}


