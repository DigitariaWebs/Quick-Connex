import webpush from 'web-push';
import { REALTIME_ENV } from '../core/config';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!REALTIME_ENV.vapidPublicKey || !REALTIME_ENV.vapidPrivateKey) {
    throw new Error('VAPID keys missing');
  }
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    REALTIME_ENV.vapidPublicKey,
    REALTIME_ENV.vapidPrivateKey
  );
  configured = true;
}

export interface WebPushPayload {
  title: string;
  body?: string;
  data?: Record<string, string>;
}

export async function sendWebPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: WebPushPayload) {
  ensureConfigured();
  const notifPayload = {
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  } as any;
  await webpush.sendNotification(subscription as any, JSON.stringify(notifPayload));
}


