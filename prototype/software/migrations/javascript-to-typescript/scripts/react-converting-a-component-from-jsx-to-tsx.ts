// Input:  A React component in .jsx with prop-types
// Output: Same component in .tsx with TypeScript interfaces

import { useState, useEffect } from 'react';

// BEFORE (JavaScript with PropTypes):
// import PropTypes from 'prop-types';
// function UserCard({ user, onEdit, showEmail }) { ... }
// UserCard.propTypes = {
//   user: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
//   onEdit: PropTypes.func,
//   showEmail: PropTypes.bool,
// };

// AFTER (TypeScript):
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;  // optional property
}

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;  // optional callback
  showEmail?: boolean;             // defaults to true
}

function UserCard({ user, onEdit, showEmail = true }: UserCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (updated: Partial<User>) => {
    onEdit?.({ ...user, ...updated });  // optional chaining
    setIsEditing(false);
  };

  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      {showEmail && <p>{user.email}</p>}
      {user.avatar && <img src={user.avatar} alt={user.name} />}
      {onEdit && (
        <button onClick={() => setIsEditing(true)}>Edit</button>
      )}
    </div>
  );
}

export default UserCard;
