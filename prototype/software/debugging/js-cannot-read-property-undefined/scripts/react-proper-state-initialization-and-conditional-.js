// Input:  React component fetching async data
// Output: Safe rendering that never throws on undefined state

import { useState, useEffect } from 'react';

function UserList() {
  // Always initialize state with the correct empty type
  const [users, setUsers] = useState([]);    // [] not undefined
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        // Validate before setting state
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (users.length === 0) return <p>No users found.</p>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user?.name ?? 'Anonymous'}</li>
      ))}
    </ul>
  );
}
