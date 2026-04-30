// Input:  Reusable logic scattered across class lifecycle methods
// Output: Custom hook that encapsulates the same logic for any component

import { useState, useEffect, useRef } from 'react';

// Custom hook: replaces a class mixin/HOC pattern for window resize tracking
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// Custom hook: replaces class interval pattern (this.interval in constructor/mount/unmount)
function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Usage — replaces a class component that combined resize + interval
function Dashboard() {
  const { width } = useWindowSize();
  const [data, setData] = useState(null);

  useInterval(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData);
  }, 30000);  // Poll every 30s

  return (
    <div>
      <p>Window width: {width}</p>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

export default Dashboard;
