import PushSubscription from '@/models/PushSubscription';

export interface BrowserPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function registerSubscription(userId: string, sub: BrowserPushSubscription) {
  await PushSubscription.updateOne(
    { endpoint: sub.endpoint },
    { userId, endpoint: sub.endpoint, keys: sub.keys },
    { upsert: true }
  );
}

export async function unregisterSubscription(endpoint: string) {
  await PushSubscription.deleteOne({ endpoint });
}

export async function getUserSubscriptions(userId: string) {
  return PushSubscription.find({ userId });
}


