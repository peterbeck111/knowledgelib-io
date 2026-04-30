// Input:  CRA app with react-router-dom routes
// Output: Equivalent Next.js App Router file structure

// BEFORE: CRA with react-router-dom (src/App.tsx)
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import Home from './pages/Home';
// import Dashboard from './pages/Dashboard';
// import UserProfile from './pages/UserProfile';
//
// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/dashboard" element={<Dashboard />} />
//         <Route path="/users/:id" element={<UserProfile />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// AFTER: Next.js App Router file structure
// app/
// ├── page.tsx              → /
// ├── dashboard/
// │   └── page.tsx          → /dashboard
// └── users/
//     └── [id]/
//         └── page.tsx      → /users/:id

// app/page.tsx (Home)
export default function Home() {
  return <h1>Home Page</h1>
}

// app/dashboard/page.tsx
'use client' // Add if component uses hooks, state, or browser APIs

export default function Dashboard() {
  return <h1>Dashboard</h1>
}

// app/users/[id]/page.tsx
// Next.js passes params as a prop to page components
export default async function UserProfile({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <h1>User {id}</h1>
}
