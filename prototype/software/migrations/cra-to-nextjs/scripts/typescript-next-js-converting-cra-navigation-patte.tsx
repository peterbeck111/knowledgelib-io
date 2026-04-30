// Input:  CRA components using react-router hooks
// Output: Next.js equivalents using next/navigation

// BEFORE: CRA with react-router-dom
// import { useNavigate, useParams, useLocation } from 'react-router-dom';
//
// function MyComponent() {
//   const navigate = useNavigate();
//   const { id } = useParams();
//   const location = useLocation();
//   return <button onClick={() => navigate('/dashboard')}>Go</button>;
// }

// AFTER: Next.js App Router
'use client'

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function MyComponent() {
  const router = useRouter()
  const params = useParams()       // { id: '123' } for /users/[id]
  const pathname = usePathname()   // '/users/123'
  const searchParams = useSearchParams() // URLSearchParams

  return (
    <div>
      {/* Programmatic navigation */}
      <button onClick={() => router.push('/dashboard')}>Go</button>

      {/* Declarative navigation (preferred) */}
      <Link href="/dashboard">Dashboard</Link>

      {/* Dynamic route link */}
      <Link href={`/users/${params.id}`}>Profile</Link>

      {/* Navigation with query params */}
      <button onClick={() => router.push('/search?q=hello')}>Search</button>

      {/* Replace instead of push */}
      <button onClick={() => router.replace('/login')}>Login</button>

      {/* Go back */}
      <button onClick={() => router.back()}>Back</button>
    </div>
  )
}

export default MyComponent
