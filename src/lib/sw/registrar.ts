export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch {
    return null;
  }
}

export async function subscribePush(publicKey: string): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg || !reg.pushManager) return null;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  const convertedVapidKey = urlBase64ToUint8Array(publicKey);
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedVapidKey });
  return sub;
}

export async function registerSubscriptionWithServer(subscription: PushSubscription): Promise<boolean> {
  const body = subscription.toJSON() as any;
  const res = await fetch('/api/realtime/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.ok;
}

export async function unregisterSubscriptionWithServer(subscription: PushSubscription): Promise<boolean> {
  const body = subscription.toJSON() as any;
  const res = await fetch('/api/realtime/subscriptions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: body.endpoint }) });
  return res.ok;
}

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

export async function unsubscribePush(): Promise<boolean> {
  const sub = await getExistingSubscription();
  if (!sub) return true;
  try {
    await unregisterSubscriptionWithServer(sub);
  } catch {}
  return await sub.unsubscribe();
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


