// Input:  A React component + AngularJS module
// Output: The React component available as an AngularJS directive

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import angular from 'angular';

// Step 1: Create a standard React component
function SearchBox({ placeholder, onSearch, debounceMs = 300 }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        onSearch(query);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  return (
    <div className="search-box">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      {query && (
        <button onClick={() => { setQuery(''); onSearch(''); }}>
          Clear
        </button>
      )}
    </div>
  );
}

SearchBox.propTypes = {
  placeholder: PropTypes.string,
  onSearch: PropTypes.func.isRequired,
  debounceMs: PropTypes.number
};

// Step 2: Register as AngularJS component via bridge
angular
  .module('myApp')
  .component('searchBox', react2angular(SearchBox, ['placeholder', 'onSearch', 'debounceMs']));

// Step 3: Use in AngularJS template
// <search-box placeholder="'Search users...'" on-search="$ctrl.handleSearch"></search-box>

// IMPORTANT: AngularJS attribute names use kebab-case (on-search),
// React prop names use camelCase (onSearch). react2angular handles the mapping.
