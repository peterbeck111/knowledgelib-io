// Input:  Redux Toolkit todo slice with CRUD + filter
// Output: Equivalent Zustand store with devtools + persist

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type Filter = 'all' | 'active' | 'completed';

interface TodoState {
  todos: Todo[];
  filter: Filter;
  // Actions (no dispatch needed)
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  setFilter: (filter: Filter) => void;
  // Computed (replaces createSelector)
  filteredTodos: () => Todo[];
}

const useTodoStore = create<TodoState>()(
  devtools(
    persist(
      immer((set, get) => ({
        todos: [],
        filter: 'all' as Filter,

        addTodo: (text) =>
          set((state) => {
            state.todos.push({
              id: crypto.randomUUID(),
              text,
              completed: false,
            });
          }),

        toggleTodo: (id) =>
          set((state) => {
            const todo = state.todos.find((t) => t.id === id);
            if (todo) todo.completed = !todo.completed;
          }),

        removeTodo: (id) =>
          set((state) => {
            state.todos = state.todos.filter((t) => t.id !== id);
          }),

        setFilter: (filter) => set({ filter }),

        filteredTodos: () => {
          const { todos, filter } = get();
          switch (filter) {
            case 'active':
              return todos.filter((t) => !t.completed);
            case 'completed':
              return todos.filter((t) => t.completed);
            default:
              return todos;
          }
        },
      })),
      { name: 'todo-storage' }
    ),
    { name: 'TodoStore' }
  )
);

// Component usage — replaces useSelector + useDispatch
function TodoList() {
  const filteredTodos = useTodoStore((s) => s.filteredTodos)();
  const toggleTodo = useTodoStore((s) => s.toggleTodo);

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
