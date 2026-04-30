// Input:  A legacy jQuery page where React needs to read/write shared state
// Output: A bridge utility that lets jQuery code and React components share data

import { createRoot, Root } from 'react-dom/client';
import { useState, useEffect, useSyncExternalStore } from 'react';

// Shared store that both jQuery and React can read/write
class BridgeStore<T> {
  private state: T;
  private listeners = new Set<() => void>();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState = (): T => this.state;

  setState(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

// Usage in jQuery code:
// window.appStore = new BridgeStore({ user: null, theme: 'light' });
// window.appStore.setState({ user: { name: 'Alice' } });

// Usage in React:
function useBridgeStore<T>(store: BridgeStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getState);
}

function UserGreeting({ store }: { store: BridgeStore<{ user: { name: string } | null }> }) {
  const { user } = useBridgeStore(store);
  if (!user) return <p>Not logged in</p>;
  return <p>Hello, {user.name}</p>;
}
