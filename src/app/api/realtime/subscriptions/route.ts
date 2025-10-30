import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getUserSubscriptions, registerSubscription, unregisterSubscription } from '@/lib/realtime/server/SubscriptionService';
import { sendWebPush } from '@/lib/realtime/server/WebPushProvider';

export async function POST(request: NextRequest) {
  try {
    const { user } = await AuthService.requireAuth(request, { requireSession: true });
    const body = await request.json();
    if (!body || !body.endpoint || !body.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    await registerSubscription((user._id as any).toString(), body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await AuthService.requireAuth(request, { requireSession: true });
    const body = await request.json();
    if (!body || !body.endpoint) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    await unregisterSubscription(body.endpoint);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await AuthService.requireAuth(request, { requireSession: true });
    const subs = await getUserSubscriptions((user._id as any).toString());
    return NextResponse.json({ success: true, subscriptions: subs.map(s => ({ endpoint: s.endpoint, createdAt: s.createdAt })) });
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  // Use PUT as a simple test trigger for push (idempotent)
  try {
    const { user } = await AuthService.requireAuth(request, { requireSession: true });
    const subs = await getUserSubscriptions((user._id as any).toString());
    const tasks = subs.map(s => sendWebPush({ endpoint: s.endpoint, keys: s.keys as any }, {
      title: 'Test notification',
      body: 'Push is configured correctly.',
      data: { deeplink: '/' }
    }).catch(() => {}));
    await Promise.all(tasks);
    return NextResponse.json({ success: true, sent: subs.length });
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}


