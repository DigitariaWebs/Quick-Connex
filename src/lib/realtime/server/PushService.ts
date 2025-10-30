import { EventEnvelope } from '../events';
import { resolveRecipients, shouldSendPush } from '../core/policy';
import { getUserSubscriptions } from './SubscriptionService';
import { sendWebPush } from './WebPushProvider';

export async function maybeSendPush(envelope: EventEnvelope) {
  if (!shouldSendPush(envelope)) return;
  const recipients = resolveRecipients(envelope);
  if (!recipients.length) return;
  const tasks: Promise<any>[] = [];
  for (const userId of recipients) {
    const subs = await getUserSubscriptions(userId);
    for (const sub of subs) {
      tasks.push(
        sendWebPush(
          { endpoint: sub.endpoint, keys: sub.keys as any },
          {
            title: 'New transfer created',
            body: `Transfer ${envelope.entityId} created`,
            data: { envelopeId: envelope.id, entityId: envelope.entityId, type: envelope.type },
          }
        ).catch(() => {})
      );
    }
  }
  await Promise.all(tasks);
}


