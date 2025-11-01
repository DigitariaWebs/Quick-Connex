import Ably from 'ably';
import { REALTIME_ENV } from '../core/config';
import { APP_EVENTS_CHANNEL } from '../core/constants';

let rest: Ably.Rest | null = null;

function getRest(): Ably.Rest {
  if (rest) return rest;
  if (!REALTIME_ENV.ablyApiKey) throw new Error('ABLY_API_KEY missing');
  rest = new Ably.Rest({ key: REALTIME_ENV.ablyApiKey });
  return rest;
}

export async function createRestrictedTokenRequest(clientId: string) {
  const capability = JSON.stringify({ [APP_EVENTS_CHANNEL]: ['subscribe'] });
  const ttl = REALTIME_ENV.ablyTokenTtlMs;
  const tokenRequest = await getRest().auth.createTokenRequest({ clientId, capability, ttl });
  return tokenRequest;
}


