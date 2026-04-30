// Input:  Redux Toolkit todo slice with CRUD + filter
// Output: Equivalent Jotai atoms with derived state

import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type Filter = 'all' | 'active' | 'completed';

// Primitive atoms (replace Redux state)
const todosAtom = atomWithStorage<Todo[]>('todos', []);
const filterAtom = atom<Filter>('all');

// Write atoms (replace Redux actions)
const addTodoAtom = atom(null, (get, set, text: string) => {
  const newTodo: Todo = {
    id: crypto.randomUUID(),
    text,
    completed: false,
  };
  set(todosAtom, [...get(todosAtom), newTodo]);
});

const toggleTodoAtom = atom(null, (get, set, id: string) => {
  set(
    todosAtom,
    get(todosAtom).map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    )
  );
});

const removeTodoAtom = atom(null, (get, set, id: string) => {
  set(todosAtom, get(todosAtom).filter((t) => t.id !== id));
});

// Derived atom (replaces createSelector)
const filteredTodosAtom = atom((get) => {
  const todos = get(todosAtom);
  const filter = get(filterAtom);
  switch (filter) {
    case 'active':
      return todos.filter((t) => !t.completed);
    case 'completed':
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
});

// Component usage — replaces useSelector + useDispatch
function TodoList() {
  const filteredTodos = useAtomValue(filteredTodosAtom);
  const toggleTodo = useSetAtom(toggleTodoAtom);

  return (
    <ul>
      {filteredTodos.map((todo) => (
        <li key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {todo.completed ? '✓' : '○'} {todo.text}
        </li>
      ))}
    </ul>
  );
}
