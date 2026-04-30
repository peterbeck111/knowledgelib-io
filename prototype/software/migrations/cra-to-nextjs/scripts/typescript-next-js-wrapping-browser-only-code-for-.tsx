// Input:  CRA component that uses window/document/localStorage
// Output: Next.js component with SSR-safe browser API access

'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Pattern 1: useEffect guard (most common)
function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Safe: useEffect only runs in the browser
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved) setTheme(saved)
  }, [])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  return <button onClick={toggle}>Theme: {theme}</button>
}

// Pattern 2: typeof window check (for module-level code)
const isClient = typeof window !== 'undefined'
const screenWidth = isClient ? window.innerWidth : 0

// Pattern 3: Dynamic import with ssr: false (for entire components)
const MapComponent = dynamic(
  () => import('../components/Map'),  // Component that uses window.L (Leaflet)
  { ssr: false, loading: () => <p>Loading map...</p> }
)

export default function LocationPage() {
  return (
    <div>
      <ThemeToggle />
      <MapComponent />
    </div>
  )
}
