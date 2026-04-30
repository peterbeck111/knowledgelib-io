// Input:  A class component with timer, event listener, and derived state
// Output: Equivalent functional component with multiple useEffect calls

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  query: string;
  debounceMs?: number;
}

// AFTER: Functional component (TypeScript)
function DebouncedSearch({ query, debounceMs = 300 }: Props) {
  const [results, setResults] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const abortRef = useRef<AbortController | null>(null);

  // Effect 1: Debounce the query (replaces componentDidUpdate with timer logic)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Effect 2: Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: abortRef.current.signal,
    })
      .then(res => res.json())
      .then((data: { items: string[] }) => setResults(data.items))
      .catch(err => {
        if (err.name !== 'AbortError') console.error(err);
      });

    return () => abortRef.current?.abort();
  }, [debouncedQuery]);

  // Effect 3: Online/offline listener (replaces componentDidMount + componentWillUnmount)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div>
      {!isOnline && <p>You are offline</p>}
      <ul>
        {results.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  );
}

export default DebouncedSearch;
