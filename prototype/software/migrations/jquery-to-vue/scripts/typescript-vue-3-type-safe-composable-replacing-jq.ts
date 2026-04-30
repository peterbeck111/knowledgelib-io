// Input:  A set of jQuery $.ajax calls with consistent error handling
// Output: A type-safe Vue 3 composable with automatic loading/error state

// composables/useApi.ts
import { ref, type Ref } from 'vue';

interface UseApiReturn<T> {
  data: Ref<T | null>;
  error: Ref<string | null>;
  loading: Ref<boolean>;
  execute: (...args: unknown[]) => Promise<void>;
}

export function useApi<T>(
  url: string | ((...args: unknown[]) => string),
  options: RequestInit = {}
): UseApiReturn<T> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const error = ref<string | null>(null);
  const loading = ref(false);
  let controller: AbortController | null = null;

  async function execute(...args: unknown[]): Promise<void> {
    // Abort previous request if still in flight
    controller?.abort();
    controller = new AbortController();

    loading.value = true;
    error.value = null;

    const resolvedUrl = typeof url === 'function' ? url(...args) : url;

    try {
      const res = await fetch(resolvedUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      data.value = await res.json();
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        error.value = err.message;
      }
    } finally {
      loading.value = false;
    }
  }

  return { data, error, loading, execute };
}

// Usage:
// const { data: users, loading, error, execute: fetchUsers } = useApi<User[]>('/api/users');
// onMounted(() => fetchUsers());
