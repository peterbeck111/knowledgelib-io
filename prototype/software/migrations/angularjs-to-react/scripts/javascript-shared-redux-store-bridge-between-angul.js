// Input:  Redux store accessed by both AngularJS controllers and React components
// Output: Synchronized state across both frameworks during migration

import { configureStore, createSlice } from '@reduxjs/toolkit';

// 1. Define Redux slice (shared by both frameworks)
const filtersSlice = createSlice({
  name: 'filters',
  initialState: {
    searchQuery: '',
    category: 'all',
    sortBy: 'name'
  },
  reducers: {
    setSearchQuery: (state, action) => { state.searchQuery = action.payload; },
    setCategory: (state, action) => { state.category = action.payload; },
    setSortBy: (state, action) => { state.sortBy = action.payload; }
  }
});

export const { setSearchQuery, setCategory, setSortBy } = filtersSlice.actions;
export const store = configureStore({ reducer: { filters: filtersSlice.reducer } });

// 2. AngularJS side: connect controller to Redux store
// Uses ng-redux (npm install ng-redux)
function FilterBarCtrl($ngRedux, $scope) {
  const mapState = (state) => ({
    searchQuery: state.filters.searchQuery,
    category: state.filters.category
  });

  const mapDispatch = { setSearchQuery, setCategory };
  const unsubscribe = $ngRedux.connect(mapState, mapDispatch)($scope);
  $scope.$on('$destroy', unsubscribe);

  // Double-write pattern: update both Redux and legacy Angular service
  // Remove legacy writes once React migration is complete
  $scope.updateSearch = function(query) {
    $scope.setSearchQuery(query);       // Redux (new)
    LegacyFilterService.setSearch(query); // Angular service (legacy — remove later)
  };
}

// 3. React side: read from the same Redux store
import { useSelector, useDispatch } from 'react-redux';
import { setSearchQuery } from './store';

function SearchResults() {
  const { searchQuery, category } = useSelector(state => state.filters);
  const dispatch = useDispatch();

  // Both frameworks share the same Redux state
  return (
    <div>
      <p>Showing results for "{searchQuery}" in {category}</p>
      {/* results rendering */}
    </div>
  );
}
