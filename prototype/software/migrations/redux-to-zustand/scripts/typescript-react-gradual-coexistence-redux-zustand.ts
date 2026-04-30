// Input:  App with Redux Provider, migrating one slice at a time
// Output: Both Redux and Zustand running simultaneously

import { Provider } from 'react-redux';
import { store } from './store/reduxStore'; // remaining Redux slices
import useAuthStore from './store/useAuthStore'; // already migrated to Zustand

// App root — Redux Provider stays until all slices are migrated
function App() {
  return (
    <Provider store={store}>
      <Header />   {/* Uses Zustand (useAuthStore) */}
      <Dashboard /> {/* Uses Redux (useSelector/useDispatch) */}
      <Sidebar />   {/* Uses Zustand (useSettingsStore) */}
    </Provider>
  );
}

// Migrated component — uses Zustand directly, no Provider needed
function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header>
      <span>{user?.name}</span>
      <button onClick={logout}>Logout</button>
    </header>
  );
}

// Not yet migrated — still uses Redux
function Dashboard() {
  const data = useSelector((s: RootState) => s.dashboard.data);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  return <div>{/* render data */}</div>;
}
