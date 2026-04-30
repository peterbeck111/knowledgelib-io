// Input:  Component that conditionally renders based on viewport size
// Output: No hydration mismatch — deferred client measurement

import { useState, useEffect } from 'react';

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

export default function ResponsiveNav() {
  const { width } = useWindowSize();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Server and first client render: show nothing (consistent)
  if (!mounted) return <nav aria-label="navigation">Loading…</nav>;

  // After hydration: render based on actual width
  return (
    <nav aria-label="navigation">
      {width > 768 ? <DesktopNav /> : <MobileNav />}
    </nav>
  );
}
