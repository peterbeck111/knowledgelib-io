// Input:  Component using browser APIs that fails during next build
// Output: Properly split server + client components

// app/layout.tsx — Server Component (default)
import ClientNav from './components/ClientNav';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientNav />  {/* Client component handles browser APIs */}
        <main>{children}</main>
      </body>
    </html>
  );
}

// app/components/ClientNav.tsx — Client Component
'use client';
import { useState, useEffect } from 'react';

export default function ClientNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={scrolled ? 'nav-scrolled' : 'nav-top'}>
      <a href="/">Home</a>
    </nav>
  );
}
