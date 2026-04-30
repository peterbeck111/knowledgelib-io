// Input:  Component with "Too many re-renders" error
// Output: Fixed component that renders correctly

import { useState, useEffect, useMemo, useCallback } from 'react';

// ❌ PATTERN 1: setState during render
function BadComponent1() {
  const [items, setItems] = useState([]);
  const sorted = [...items].sort();
  setItems(sorted);  // INFINITE LOOP!
  return <ul>{sorted.map(i => <li key={i}>{i}</li>)}</ul>;
}
// ✅ FIX: Derive state instead of setting it
function GoodComponent1() {
  const [items, setItems] = useState([]);
  const sorted = useMemo(() => [...items].sort(), [items]);  // No setState needed
  return <ul>{sorted.map(i => <li key={i}>{i}</li>)}</ul>;
}

// ❌ PATTERN 2: useEffect updates its own dependency
function BadComponent2() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(count + 1);  // Updates count → triggers effect → updates count → ...
  }, [count]);
  return <p>{count}</p>;
}
// ✅ FIX: Remove dependency or use ref
function GoodComponent2() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(timer);
  }, []);  // Runs once, functional update doesn't need count in deps
  return <p>{count}</p>;
}

// ❌ PATTERN 3: Inline object as useEffect dependency
function BadComponent3({ userId }) {
  const [user, setUser] = useState(null);
  const params = { id: userId, fields: ['name', 'email'] };  // New ref every render!
  useEffect(() => {
    fetchUser(params).then(setUser);
  }, [params]);  // params is always "new" → infinite loop
  return <p>{user?.name}</p>;
}
// ✅ FIX: Use primitives or useMemo
function GoodComponent3({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetchUser({ id: userId, fields: ['name', 'email'] }).then(setUser);
  }, [userId]);  // Primitive string — stable reference
  return <p>{user?.name}</p>;
}
