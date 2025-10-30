import { AsyncLocalStorage } from 'async_hooks';

// This should match the instance used in server.ts
// In practice, you'd export from server.ts or use a shared module
export const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

export function getRequestStore() {
  return asyncLocalStorage.getStore();
}

export function getRequestId(): string | undefined {
  const store = getRequestStore();
  return store?.get('requestId');
}
