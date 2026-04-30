// Input:  Angular service using RxJS BehaviorSubject for real-time state
// Output: React custom hook with equivalent behavior using useSyncExternalStore

// --- Angular original ---
// @Injectable({ providedIn: 'root' })
// export class CartService {
//   private items$ = new BehaviorSubject<CartItem[]>([]);
//   getItems(): Observable<CartItem[]> { return this.items$.asObservable(); }
//   addItem(item: CartItem): void {
//     this.items$.next([...this.items$.getValue(), item]);
//   }
//   removeItem(id: string): void {
//     this.items$.next(this.items$.getValue().filter(i => i.id !== id));
//   }
//   getTotal(): Observable<number> {
//     return this.items$.pipe(map(items => items.reduce((sum, i) => sum + i.price, 0)));
//   }
// }

// --- React equivalent ---
import { useSyncExternalStore, useCallback, useMemo } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Module-level store (replaces @Injectable singleton)
let cartItems: CartItem[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach(fn => fn());
}

export const cartStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): CartItem[] {
    return cartItems;
  },
  addItem(item: CartItem): void {
    cartItems = [...cartItems, item];
    emitChange();
  },
  removeItem(id: string): void {
    cartItems = cartItems.filter(i => i.id !== id);
    emitChange();
  },
};

// Hook that replaces injecting CartService
export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot);
  const total = useMemo(() => items.reduce((sum, i) => sum.price * i.quantity, 0), [items]);

  const addItem = useCallback((item: CartItem) => cartStore.addItem(item), []);
  const removeItem = useCallback((id: string) => cartStore.removeItem(id), []);

  return { items, total, addItem, removeItem };
}
