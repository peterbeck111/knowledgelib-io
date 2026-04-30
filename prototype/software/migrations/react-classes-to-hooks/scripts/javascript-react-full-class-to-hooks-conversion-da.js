// Input:  A class component that fetches user data on mount/update with loading & error states
// Output: Equivalent functional component using useState + useEffect

import { useState, useEffect } from 'react';

// BEFORE: Class component
// class UserProfile extends React.Component {
//   state = { user: null, loading: true, error: null };
//   componentDidMount() { this.fetchUser(); }
//   componentDidUpdate(prevProps) {
//     if (prevProps.userId !== this.props.userId) this.fetchUser();
//   }
//   componentWillUnmount() { this.cancelled = true; }
//   async fetchUser() {
//     this.setState({ loading: true, error: null });
//     try {
//       const res = await fetch(`/api/users/${this.props.userId}`);
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const user = await res.json();
//       if (!this.cancelled) this.setState({ user, loading: false });
//     } catch (err) {
//       if (!this.cancelled) this.setState({ error: err.message, loading: false });
//     }
//   }
// }

// AFTER: Functional component with hooks
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setUser(data))
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();  // Cleanup replaces this.cancelled flag
  }, [userId]);  // Re-fetches when userId changes

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return <h1>{user?.name}</h1>;
}

export default UserProfile;
