// Input:  Angular app that needs to share auth state with React micro-frontends
// Output: CustomEvent-based bridge that works across any framework boundary

// shared/event-bridge.ts — publish/subscribe via CustomEvent (DOM-native, zero deps)
interface AuthPayload {
  userId: string;
  token: string;
  roles: string[];
}

type EventMap = {
  'auth:login': AuthPayload;
  'auth:logout': undefined;
  'theme:change': { theme: 'light' | 'dark' };
};

export function emit<K extends keyof EventMap>(event: K, detail: EventMap[K]): void {
  window.dispatchEvent(new CustomEvent(event, { detail }));
}

export function on<K extends keyof EventMap>(
  event: K,
  handler: (detail: EventMap[K]) => void
): () => void {
  const wrapper = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(event, wrapper);
  return () => window.removeEventListener(event, wrapper);
}

// --- Angular side: emit on login ---
// import { emit } from '../shared/event-bridge';
// this.authService.login(credentials).subscribe(user => {
//   emit('auth:login', { userId: user.id, token: user.token, roles: user.roles });
// });

// --- React side: subscribe to auth events ---
import { useState, useEffect } from 'react';
import { on } from '../shared/event-bridge';

export function useAuthBridge() {
  const [auth, setAuth] = useState<AuthPayload | null>(null);

  useEffect(() => {
    const offLogin = on('auth:login', (detail) => setAuth(detail));
    const offLogout = on('auth:logout', () => setAuth(null));
    return () => { offLogin(); offLogout(); };
  }, []);

  return auth;
}
