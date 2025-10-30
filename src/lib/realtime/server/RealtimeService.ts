import { EventEnvelope } from '../events';
import { publishEvent } from '@/lib/realtime/ably-server';
import { maybeSendPush } from './PushService';

export class RealtimeService {
  static async emitEnvelope(envelope: EventEnvelope) {
    await publishEvent(envelope);
  }

  static async emitAndMaybeNotify(envelope: EventEnvelope) {
    await publishEvent(envelope);
    await maybeSendPush(envelope);
  }
}


