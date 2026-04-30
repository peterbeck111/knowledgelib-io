// Input:  AngularJS service with $http calls and state
// Output: React custom hook with equivalent functionality

// BEFORE: AngularJS service
// angular.module('myApp').factory('UserService', function($http) {
//   return {
//     getUsers: () => $http.get('/api/users').then(res => res.data),
//     updateUser: (id, data) => $http.put(`/api/users/${id}`, data).then(res => res.data),
//     deleteUser: (id) => $http.delete(`/api/users/${id}`)
//   };
// });

// AFTER: React custom hook (TypeScript)
import { useState, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: User[] = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<User>) => {
    setError(null);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const updated: User = await response.json();
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      throw err;  // re-throw so callers can handle
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      throw err;
    }
  }, []);

  return { users, loading, error, fetchUsers, updateUser, deleteUser };
}

// Usage in React component:
// function UserListPage() {
//   const { users, loading, error, fetchUsers, deleteUser } = useUsers();
//   useEffect(() => { fetchUsers(); }, [fetchUsers]);
//   if (loading) return <Spinner />;
//   if (error) return <ErrorBanner message={error} />;
//   return <UserTable users={users} onDelete={deleteUser} />;
// }
